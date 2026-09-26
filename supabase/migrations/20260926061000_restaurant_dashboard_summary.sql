-- Restaurant dashboard scalability: aggregate metrics in PostgreSQL
create or replace function public.restaurant_dashboard_summary(p_restaurant_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_tz text;
  v_today date;
  v_result jsonb;
begin
  select coalesce(nullif(r.timezone,''),'America/Santiago')
    into v_tz
  from public.restaurants r
  where r.id=p_restaurant_id;

  v_tz:=coalesce(v_tz,'America/Santiago');
  v_today:=(now() at time zone v_tz)::date;

  with valid as (
    select o.*
    from public.restaurant_orders o
    where o.restaurant_id=p_restaurant_id
      and coalesce(lower(o.status),'')<>'cancelado'
      and coalesce(lower(o.payment_status),'approved')<>'rejected'
      and (
        lower(coalesce(o.order_source,''))='waiter'
        or (lower(coalesce(o.order_source,''))='online' and lower(coalesce(o.payment_status,''))='approved')
        or (
          lower(coalesce(o.order_source,''))='table_qr'
          and (
            lower(btrim(coalesce(o.payment_method,''))) not in ('mercado pago','qr bolivia')
            or lower(coalesce(o.payment_status,''))='approved'
          )
        )
      )
  ),
  recent30 as (
    select *
    from valid
    where (created_at at time zone v_tz)::date >= v_today-29
      and (created_at at time zone v_tz)::date <= v_today
  ),
  today_summary as (
    select count(*)::bigint order_count,coalesce(sum(total),0) sales
    from valid
    where (created_at at time zone v_tz)::date=v_today
  ),
  day_series as (
    select gs::date as local_day
    from generate_series((v_today-6)::timestamp,v_today::timestamp,interval '1 day') gs
  ),
  sales_days as (
    select d.local_day,coalesce(sum(v.total),0) sales
    from day_series d
    left join valid v on (v.created_at at time zone v_tz)::date=d.local_day
    group by d.local_day
    order by d.local_day
  ),
  status_counts as (
    select status,count(*)::bigint count
    from recent30
    group by status
    order by count desc
  ),
  item_counts as (
    select
      coalesce(nullif(btrim(item->>'name'),''),nullif(btrim(item->>'product_name'),''),'Producto') product_name,
      sum(case
        when coalesce(item->>'qty',item->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$'
          then coalesce(item->>'qty',item->>'quantity')::numeric
        else 1
      end) quantity
    from recent30 r
    cross join lateral jsonb_array_elements(case when jsonb_typeof(r.items)='array' then r.items else '[]'::jsonb end) item
    group by 1
    order by quantity desc
    limit 5
  )
  select jsonb_build_object(
    'products_available',(select count(*) from public.restaurant_products p where p.restaurant_id=p_restaurant_id and p.available=true),
    'today_orders',(select order_count from today_summary),
    'today_sales',(select sales from today_summary),
    'today_average',(select case when order_count>0 then sales/order_count else 0 end from today_summary),
    'sales_days',coalesce((select jsonb_agg(jsonb_build_object('day',local_day,'sales',sales) order by local_day) from sales_days),'[]'::jsonb),
    'status_counts',coalesce((select jsonb_agg(jsonb_build_object('status',status,'count',count) order by count desc) from status_counts),'[]'::jsonb),
    'top_products',coalesce((select jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity) order by quantity desc) from item_counts),'[]'::jsonb)
  ) into v_result;

  return coalesce(v_result,'{}'::jsonb);
end
$$;

revoke all on function public.restaurant_dashboard_summary(bigint) from public,anon;
grant execute on function public.restaurant_dashboard_summary(bigint) to authenticated;
