create or replace function public.request_business_custom_domain(
  p_restaurant_id bigint,
  p_hostname text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_host text;
begin
  if (select auth.uid()) is null or not public.can_manage_restaurant(p_restaurant_id) then
    raise exception 'No autorizado';
  end if;

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

  v_host := private.normalize_custom_hostname(p_hostname);

  if v_host='yummypro.online' or v_host like '%.yummypro.online'
     or v_host='github.io' or v_host like '%.github.io'
     or v_host='supabase.co' or v_host like '%.supabase.co' then
    raise exception 'Ese dominio está reservado';
  end if;

  if exists(
    select 1
    from public.business_custom_domains d
    where lower(d.hostname)=v_host
      and d.restaurant_id<>p_restaurant_id
      and d.status<>'disabled'
  ) then
    raise exception 'Ese dominio ya está vinculado a otro negocio';
  end if;

  if exists(
    select 1
    from public.business_custom_domains d
    where d.restaurant_id=p_restaurant_id
      and lower(d.hostname)=v_host
      and d.status in ('pending_dns','dns_verified','provisioning','failed','active')
  ) then
    return public.get_business_custom_domain(p_restaurant_id);
  end if;

  update public.business_custom_domains
  set status='disabled', updated_at=now()
  where restaurant_id=p_restaurant_id
    and status in ('pending_dns','dns_verified','provisioning','failed');

  insert into public.business_custom_domains(
    restaurant_id,hostname,status,verification_token,ssl_status,provider,created_at,updated_at
  )
  values(
    p_restaurant_id,v_host,'pending_dns',gen_random_uuid(),'pending','cloudflare_saas',now(),now()
  );

  return public.get_business_custom_domain(p_restaurant_id);

exception
  when unique_violation then
    raise exception 'Ese dominio ya está en proceso de vinculación';
end
$function$;
