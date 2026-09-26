-- Public catalog scalability: bounded pages with server-side search
create index if not exists restaurant_products_public_search_trgm_idx
on public.restaurant_products
using gin ((coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(badge,'')) gin_trgm_ops);

create or replace function public.get_public_restaurant_catalog_page(
  p_restaurant_id bigint,
  p_limit integer default 120,
  p_offset integer default 0,
  p_search text default null
)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
with allowed as (
  select r.id
  from public.restaurants r
  where r.id=p_restaurant_id
    and r.active=true
    and r.business_type='restaurant'
    and r.subscription_status in ('trial','active')
    and (r.subscription_expires_at is null or r.subscription_expires_at>now())
),
cats as (
  select c.id,c.name,c.slug,c.sort_order
  from public.restaurant_categories c
  join allowed a on a.id=c.restaurant_id
  where c.active=true
),
filtered as (
  select p.*
  from public.restaurant_products p
  join allowed a on a.id=p.restaurant_id
  left join cats c on c.id=p.category_id
  where p.available=true
    and (
      nullif(btrim(coalesce(p_search,'')),'') is null
      or (coalesce(p.name,'')||' '||coalesce(p.description,'')||' '||coalesce(p.badge,'')||' '||coalesce(c.name,'')) ilike '%'||btrim(p_search)||'%'
    )
),
page as (
  select *
  from filtered
  order by sort_order,id
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,120),1),200)
),
rows as (
 select
   p.id,p.category_id,p.name,p.description,p.price,p.compare_price,p.image_url,p.badge,p.featured,p.sort_order,
   coalesce((
     select jsonb_agg(
       jsonb_build_object(
         'id',g.id,'name',g.name,'selection_type',g.selection_type,'required',g.required,
         'min_select',g.min_select,'max_select',g.max_select,'sort_order',g.sort_order,
         'options',coalesce((
           select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'price_delta',o.price_delta,'sort_order',o.sort_order) order by o.sort_order,o.id)
           from public.restaurant_product_options o
           where o.restaurant_id=p.restaurant_id and o.group_id=g.id and o.available=true
         ),'[]'::jsonb)
       ) order by g.sort_order,g.id
     )
     from public.restaurant_product_option_groups g
     where g.restaurant_id=p.restaurant_id and g.product_id=p.id and g.active=true
   ),'[]'::jsonb) option_groups
 from page p
)
select jsonb_build_object(
  'total',(select count(*) from filtered),
  'categories',coalesce((
    select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'sort_order',c.sort_order) order by c.sort_order,c.id) from cats c
  ),'[]'::jsonb)
  || case when exists(select 1 from filtered f where f.category_id is null or not exists(select 1 from cats c where c.id=f.category_id))
          then jsonb_build_array(jsonb_build_object('id',null,'name','General','slug','general','sort_order',2147483647))
          else '[]'::jsonb end,
  'rows',coalesce((select jsonb_agg(to_jsonb(rows) order by sort_order,id) from rows),'[]'::jsonb)
)
$$;

revoke all on function public.get_public_restaurant_catalog_page(bigint,integer,integer,text) from public;
grant execute on function public.get_public_restaurant_catalog_page(bigint,integer,integer,text) to anon,authenticated;

create or replace function public.get_public_retail_catalog_page(
  p_restaurant_id bigint,
  p_limit integer default 120,
  p_offset integer default 0,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_result jsonb;
begin
  perform public.retail_release_expired_online_orders();

  if not exists(
    select 1 from public.restaurants r
    where r.id=p_restaurant_id
      and r.active=true
      and r.business_type in ('supermarket','minimarket')
      and r.subscription_status in ('trial','active')
      and (r.subscription_expires_at is null or r.subscription_expires_at>now())
  ) then
    return jsonb_build_object('total',0,'categories','[]'::jsonb,'rows','[]'::jsonb);
  end if;

  with filtered as (
    select p.id,p.barcode,p.sku,p.name,p.description,p.category,p.brand,p.unit,p.price,
           p.current_stock,p.minimum_stock,p.image_url,p.allow_fractional
    from public.retail_products p
    where p.restaurant_id=p_restaurant_id
      and p.active=true
      and (
        nullif(btrim(coalesce(p_search,'')),'') is null
        or (coalesce(p.name,'')||' '||coalesce(p.brand,'')||' '||coalesce(p.category,'')||' '||coalesce(p.barcode,'')||' '||coalesce(p.sku,'')) ilike '%'||btrim(p_search)||'%'
      )
  ),
  page as (
    select * from filtered
    order by coalesce(category,''),name,id
    offset greatest(coalesce(p_offset,0),0)
    limit least(greatest(coalesce(p_limit,120),1),200)
  ),
  categories as (
    select category,count(*)::bigint product_count
    from (
      select coalesce(nullif(btrim(p.category),''),'General') category
      from public.retail_products p
      where p.restaurant_id=p_restaurant_id and p.active=true
    ) x
    group by category
  )
  select jsonb_build_object(
    'total',(select count(*) from filtered),
    'categories',coalesce((select jsonb_agg(jsonb_build_object('name',category,'product_count',product_count) order by category) from categories),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg(to_jsonb(page) order by coalesce(category,''),name,id) from page),'[]'::jsonb)
  ) into v_result;

  return v_result;
end
$$;

revoke all on function public.get_public_retail_catalog_page(bigint,integer,integer,text) from public;
grant execute on function public.get_public_retail_catalog_page(bigint,integer,integer,text) to anon,authenticated;

analyze public.restaurant_products;
