-- YummyPro Pruebas: Marca blanca por negocio
-- Aplicar en Producción únicamente durante un release autorizado.

alter table public.restaurants
  add column if not exists white_label_enabled boolean not null default false;

comment on column public.restaurants.white_label_enabled is
  'Oculta YummyPro y deja solo la identidad del negocio en sus superficies públicas.';

create or replace function public.streaming_public_catalog(p_restaurant_id bigint)
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  select jsonb_build_object(
    'business',
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'is_demo', coalesce(r.is_demo,false),
        'effective_demo', coalesce(r.is_demo,false) and not coalesce(o.enabled,false),
        'logo_url', r.logo_url,
        'whatsapp', r.whatsapp,
        'currency_code', coalesce(r.currency_code,'CLP'),
        'locale', coalesce(r.locale,'es-CL'),
        'country_code', coalesce(r.country_code,'CL'),
        'theme_primary_color', r.theme_primary_color,
        'theme_secondary_color', r.theme_secondary_color,
        'white_label_enabled', coalesce(r.white_label_enabled,false),
        'accept_mercadopago', coalesce(r.accept_mercadopago,true),
        'payment_online_ready',
          coalesce(r.accept_mercadopago,true)
          and nullif(trim(coalesce(r.mercadopago_public_key,'')),'') is not null
          and exists (
            select 1 from public.restaurant_payment_connections pc
            where pc.restaurant_id=r.id
              and nullif(trim(coalesce(pc.access_token,'')),'') is not null
          )
      ),
    'products',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'default_duration_days', p.default_duration_days,
            'sale_price', p.sale_price,
            'free_slots', greatest(
              coalesce((
                select sum(
                  greatest(
                    coalesce(a.max_slots,1)::bigint -
                    (
                      select count(*)
                      from public.streaming_subscriptions s
                      where s.restaurant_id = r.id
                        and s.account_id = a.id
                        and s.status = 'active'
                        and coalesce(s.starts_at, now()) <= now()
                        and s.expires_at > now()
                    ),
                    0
                  )
                )
                from public.streaming_accounts a
                where a.restaurant_id = r.id
                  and a.platform_id = p.id
                  and a.active is distinct from false
              ),0)
              -
              coalesce((
                select sum(greatest(1,coalesce(nullif(i->>'qty','')::integer,1)))
                from public.streaming_orders so
                cross join lateral jsonb_array_elements(so.items) i
                where so.restaurant_id=r.id
                  and so.status='pending_payment'
                  and so.payment_status='pending'
                  and so.created_at > now() - interval '30 minutes'
                  and (i->>'platform_id')::bigint=p.id
              ),0),
              0
            )
          )
          order by p.sort_order nulls last, p.name
        )
        from public.streaming_platforms p
        where p.restaurant_id = r.id
          and p.active is distinct from false
      ), '[]'::jsonb)
  )
  from public.restaurants r
  left join public.business_payment_test_overrides o on o.restaurant_id=r.id
  where r.id = p_restaurant_id
    and r.business_type = 'streaming'
    and r.active is distinct from false
    and coalesce(r.subscription_status,'trial') in ('trial','active')
    and (r.subscription_expires_at is null or r.subscription_expires_at > now());
$function$;

create or replace function public.streaming_public_catalog(p_ref text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_business public.restaurants%rowtype;
  v_items jsonb;
begin
  select r.* into v_business
  from public.restaurants r
  where r.active = true
    and r.business_type = 'streaming'
    and (
      r.slug = nullif(btrim(coalesce(p_ref,'')),'')
      or r.id::text = nullif(btrim(coalesce(p_ref,'')),'')
    )
  limit 1;

  if v_business.id is null then
    return jsonb_build_object('ok',false,'error','not_found');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'duration_days', p.default_duration_days,
      'price', p.sale_price,
      'available_slots', coalesce(cap.available_slots,0),
      'active', p.active
    )
    order by p.sort_order asc, p.name asc
  ), '[]'::jsonb)
  into v_items
  from public.streaming_platforms p
  left join lateral (
    select greatest(
      coalesce(sum(a.max_slots),0)
      - coalesce(count(s.id) filter (
          where coalesce(s.status,'active') not in ('cancelled','paused')
            and (s.expires_at is null or s.expires_at > now())
        ),0),
      0
    )::int as available_slots
    from public.streaming_accounts a
    left join public.streaming_subscriptions s
      on s.account_id = a.id
     and s.restaurant_id = a.restaurant_id
    where a.restaurant_id = v_business.id
      and a.platform_id = p.id
      and a.active = true
  ) cap on true
  where p.restaurant_id = v_business.id
    and p.active = true;

  return jsonb_build_object(
    'ok',true,
    'business',jsonb_build_object(
      'id',v_business.id,
      'name',v_business.name,
      'slug',v_business.slug,
      'whatsapp',coalesce(v_business.whatsapp,''),
      'currency_code',coalesce(v_business.currency_code,'CLP'),
      'locale',coalesce(v_business.locale,'es-CL'),
      'country_code',coalesce(v_business.country_code,'CL'),
      'white_label_enabled',coalesce(v_business.white_label_enabled,false)
    ),
    'items',v_items
  );
end
$function$;
