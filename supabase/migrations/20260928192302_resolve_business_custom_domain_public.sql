create or replace function public.resolve_business_custom_domain(p_hostname text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'restaurant_id', r.id,
    'slug', r.slug,
    'business_type', coalesce(r.business_type,'restaurant')
  )
  from public.business_custom_domains d
  join public.restaurants r on r.id=d.restaurant_id
  where d.hostname=private.normalize_custom_hostname(p_hostname)
    and d.status='active'
    and r.active is true
  order by d.activated_at desc nulls last, d.id desc
  limit 1
$$;

revoke all on function public.resolve_business_custom_domain(text) from public;
grant execute on function public.resolve_business_custom_domain(text) to anon, authenticated, service_role;
