-- Restaurant panel scalability: paginated products and inventory
create index if not exists restaurant_inventory_items_search_trgm_idx
on public.restaurant_inventory_items
using gin ((coalesce(name,'') || ' ' || coalesce(supplier,'')) gin_trgm_ops);

create or replace function public.restaurant_product_directory_page(
  p_restaurant_id bigint,
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
with scoped as (
  select p.* from public.restaurant_products p where p.restaurant_id=p_restaurant_id
),
filtered as (
  select * from scoped
  where nullif(btrim(coalesce(p_search,'')),'') is null
     or (coalesce(name,'')||' '||coalesce(description,'')||' '||coalesce(badge,'')) ilike '%'||btrim(p_search)||'%'
),
page as (
  select * from filtered
  order by sort_order,id
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,50),1),100)
)
select jsonb_build_object(
  'total',(select count(*) from filtered),
  'available_count',(select count(*) from scoped where available=true),
  'rows',coalesce((select jsonb_agg(to_jsonb(page) order by sort_order,id) from page),'[]'::jsonb)
)
$$;

revoke all on function public.restaurant_product_directory_page(bigint,integer,integer,text) from public,anon;
grant execute on function public.restaurant_product_directory_page(bigint,integer,integer,text) to authenticated;

create or replace function public.restaurant_inventory_directory_page(
  p_restaurant_id bigint,
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
with scoped as (
  select i.* from public.restaurant_inventory_items i where i.restaurant_id=p_restaurant_id
),
filtered as (
  select * from scoped
  where nullif(btrim(coalesce(p_search,'')),'') is null
     or (coalesce(name,'')||' '||coalesce(supplier,'')) ilike '%'||btrim(p_search)||'%'
),
page as (
  select * from filtered
  order by active desc,name,id
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,50),1),100)
),
metrics as (
  select
    count(*) filter(where active)::bigint active_count,
    count(*) filter(where active and current_stock<=minimum_stock)::bigint low_count,
    coalesce(sum(current_stock*unit_cost),0) inventory_value
  from scoped
),
recent as (
  select m.id,m.inventory_item_id,m.movement_type,m.quantity_delta,m.note,m.created_at,i.name item_name
  from public.restaurant_inventory_movements m
  left join public.restaurant_inventory_items i
    on i.id=m.inventory_item_id and i.restaurant_id=m.restaurant_id
  where m.restaurant_id=p_restaurant_id
  order by m.created_at desc,m.id desc
  limit 100
)
select jsonb_build_object(
  'total',(select count(*) from filtered),
  'active_count',(select active_count from metrics),
  'low_count',(select low_count from metrics),
  'inventory_value',(select inventory_value from metrics),
  'rows',coalesce((select jsonb_agg(to_jsonb(page) order by active desc,name,id) from page),'[]'::jsonb),
  'recent_movements',coalesce((select jsonb_agg(to_jsonb(recent) order by created_at desc,id desc) from recent),'[]'::jsonb)
)
$$;

revoke all on function public.restaurant_inventory_directory_page(bigint,integer,integer,text) from public,anon;
grant execute on function public.restaurant_inventory_directory_page(bigint,integer,integer,text) to authenticated;

analyze public.restaurant_products;
analyze public.restaurant_inventory_items;
analyze public.restaurant_inventory_movements;
