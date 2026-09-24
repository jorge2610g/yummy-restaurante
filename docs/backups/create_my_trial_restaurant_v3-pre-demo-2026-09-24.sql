-- Respaldo de create_my_trial_restaurant_v3 antes de marcar nuevas pruebas como DEMO.
-- Fecha: 2026-09-24
-- Fuente: Supabase public.create_my_trial_restaurant_v3

CREATE OR REPLACE FUNCTION public.create_my_trial_restaurant_v3(
  p_name text,
  p_whatsapp text DEFAULT ''::text,
  p_address text DEFAULT ''::text,
  p_country_code text DEFAULT 'CL'::text,
  p_intended_plan_id bigint DEFAULT NULL::bigint,
  p_business_type text DEFAULT 'restaurant'::text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_restaurant_id bigint;
  v_slug text;
  v_trial public.subscription_plans%rowtype;
  v_country public.platform_countries%rowtype;
  v_intended_plan_id bigint;
  v_business_type text:=lower(btrim(coalesce(p_business_type,'restaurant')));
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para crear tu negocio'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'El nombre del negocio es obligatorio'; end if;
  if v_business_type not in ('restaurant','supermarket','minimarket','professional') then
    raise exception 'Tipo de negocio inválido';
  end if;
  if exists(select 1 from public.restaurant_staff where user_id=v_uid and active) then
    raise exception 'Tu usuario ya tiene un negocio asignado';
  end if;

  select * into v_trial
  from public.subscription_plans
  where is_default_trial=true and active=true and business_type=v_business_type
  limit 1;
  if not found then raise exception 'La prueba gratuita para este tipo de negocio no está configurada'; end if;

  select id into v_intended_plan_id
  from public.subscription_plans
  where id=p_intended_plan_id
    and active=true
    and coalesce(is_default_trial,false)=false
    and business_type=v_business_type;
  if not found then v_intended_plan_id:=null; end if;

  select * into v_country
  from public.platform_countries
  where code=upper(trim(coalesce(p_country_code,'CL'))) and active=true
  limit 1;
  if not found then
    select * into v_country
    from public.platform_countries
    where code='CL' and active=true
    limit 1;
  end if;
  if not found then raise exception 'No hay un país activo disponible para crear el negocio'; end if;

  select email into v_email from auth.users where id=v_uid;
  v_slug:=lower(regexp_replace(extensions.unaccent(trim(p_name)),'[^a-zA-Z0-9]+','-','g'));
  v_slug:=trim(both '-' from v_slug);
  if v_slug='' then v_slug:='negocio'; end if;
  if exists(select 1 from public.restaurants where slug=v_slug) then
    v_slug:=v_slug||'-'||substr(replace(v_uid::text,'-',''),1,6);
  end if;

  insert into public.restaurants(
    name,slug,whatsapp,address,active,business_type,
    country_code,currency_code,locale,timezone,
    subscription_status,subscription_started_at,subscription_expires_at,
    subscription_plan_id,subscription_plan,subscription_price,
    subscription_modules_customized,subscription_module_overrides,
    trial_intended_plan_id,trial_intended_plan_selected_at
  )
  values(
    trim(p_name),v_slug,coalesce(trim(p_whatsapp),''),coalesce(trim(p_address),''),
    true,v_business_type,v_country.code,v_country.currency_code,v_country.locale,v_country.timezone,
    'trial',now(),now()+make_interval(days=>greatest(v_trial.days,1)),
    v_trial.id,v_trial.name,0,false,'[]'::jsonb,
    v_intended_plan_id,case when v_intended_plan_id is not null then now() else null end
  )
  returning id into v_restaurant_id;

  insert into public.restaurant_staff(restaurant_id,user_id,email,role,active)
  values(v_restaurant_id,v_uid,coalesce(v_email,''),'restaurant',true);

  insert into public.app_events(app_context,event_name,module,restaurant_id,user_id,plan_id,metadata)
  values('landing','trial_started','signup',v_restaurant_id,v_uid,v_intended_plan_id,
    jsonb_build_object('country_code',v_country.code,'business_type',v_business_type));

  return v_restaurant_id;
end;
$function$;
