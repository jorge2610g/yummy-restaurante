-- Backup de public.get_restaurant_subscription_access antes de acceso completo para demos.
-- Fecha: 2026-09-24

CREATE OR REPLACE FUNCTION public.get_restaurant_subscription_access(p_restaurant_id bigint)
RETURNS TABLE(restaurant_id bigint, subscription_usable boolean, subscription_status text, plan_id bigint, plan_name text, customized boolean, base_modules jsonb, effective_modules jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
declare
  r public.restaurants%rowtype;
  p public.subscription_plans%rowtype;
  v_base jsonb := '[]'::jsonb;
  v_effective jsonb := '[]'::jsonb;
  v_usable boolean := false;
begin
  if not (
    public.is_site_admin()
    or exists(
      select 1 from public.restaurant_staff s
      where s.restaurant_id=p_restaurant_id and s.user_id=auth.uid() and s.active=true
    )
  ) then raise exception 'No autorizado'; end if;

  select * into r from public.restaurants where id=p_restaurant_id;
  if not found then raise exception 'Restaurante no encontrado'; end if;

  v_usable := r.active
    and lower(coalesce(r.subscription_status,'')) in ('trial','active')
    and (r.subscription_expires_at is null or r.subscription_expires_at > now());

  if r.subscription_plan_id is not null then
    select * into p
    from public.subscription_plans
    where id=r.subscription_plan_id
      and business_type=coalesce(r.business_type,'restaurant')
    limit 1;
  elsif lower(coalesce(r.subscription_status,''))='trial'
     or lower(coalesce(r.subscription_plan,'')) like '%prueba%' then
    select * into p
    from public.subscription_plans
    where is_default_trial=true
      and business_type=coalesce(r.business_type,'restaurant')
    limit 1;
  end if;

  v_base := public.normalize_module_array(coalesce(p.modules,'[]'::jsonb));
  if coalesce(r.subscription_modules_customized,false) then
    v_effective := public.normalize_module_array(coalesce(r.subscription_module_overrides,'[]'::jsonb));
  else
    v_effective := v_base;
  end if;
  if not v_usable then v_effective := '[]'::jsonb; end if;

  return query select
    r.id,v_usable,r.subscription_status,coalesce(r.subscription_plan_id,p.id),
    coalesce(p.name,r.subscription_plan),coalesce(r.subscription_modules_customized,false),
    v_base,v_effective;
end;
$function$;
