create or replace function public.service_activate_business_custom_domain(
  p_restaurant_id bigint,
  p_hostname text,
  p_provider_hostname_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_host text;
begin
  if not exists(
    select 1
    from public.restaurants r
    left join public.subscription_plans p on p.id=r.subscription_plan_id
    where r.id=p_restaurant_id
      and r.active is true
      and lower(coalesce(r.subscription_status,''))='active'
      and lower(btrim(coalesce(p.name,r.subscription_plan,'')))='pro'
  ) then
    raise exception 'Los dominios personalizados están disponibles solo para cuentas PRO activas';
  end if;

  v_host:=private.normalize_custom_hostname(p_hostname);

  if not exists(
    select 1
    from public.business_custom_domains d
    where d.restaurant_id=p_restaurant_id
      and lower(d.hostname)=v_host
      and d.status in ('dns_verified','provisioning','active')
  ) then
    raise exception 'Dominio no verificado';
  end if;

  update public.business_custom_domains
  set status='disabled', updated_at=now()
  where restaurant_id=p_restaurant_id
    and status='active'
    and lower(hostname)<>v_host;

  update public.business_custom_domains
  set status='active',
      ssl_status='active',
      provider_hostname_id=coalesce(p_provider_hostname_id,provider_hostname_id),
      activated_at=coalesce(activated_at,now()),
      updated_at=now(),
      last_error=null
  where restaurant_id=p_restaurant_id
    and lower(hostname)=v_host;

  update public.restaurants
  set custom_domain=v_host,updated_at=now()
  where id=p_restaurant_id;

  return jsonb_build_object(
    'restaurant_id',p_restaurant_id,
    'hostname',v_host,
    'status','active'
  );
end
$function$;

revoke all on function public.service_activate_business_custom_domain(bigint,text,text) from public, anon, authenticated;
grant execute on function public.service_activate_business_custom_domain(bigint,text,text) to service_role;
