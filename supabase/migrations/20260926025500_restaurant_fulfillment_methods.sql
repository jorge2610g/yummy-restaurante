-- YummyPro Pruebas: métodos de entrega por restaurante
-- Producción NO debe ejecutar esta migración hasta que el propietario autorice un release.
alter table public.restaurants
  add column if not exists pickup_enabled boolean not null default true,
  add column if not exists delivery_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_fulfillment_method_enabled'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_fulfillment_method_enabled
      check (pickup_enabled or delivery_enabled);
  end if;
end $$;

comment on column public.restaurants.pickup_enabled is 'Permite pedidos para retiro en el local.';
comment on column public.restaurants.delivery_enabled is 'Permite pedidos con delivery.';
