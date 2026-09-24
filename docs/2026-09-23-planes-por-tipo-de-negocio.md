# Planes por tipo de negocio — Panel — 2026-09-23

## Versión
Panel de negocio: `v2.5.14`.

## Cambio
El panel ya no carga todos los planes activos.

Ahora consulta únicamente los planes cuyo `business_type` corresponde al negocio actual:

- Restaurante → planes `restaurant`
- Supermercado → planes `supermarket`
- Minimarket / Tienda → planes `minimarket`

## Módulos Retail
Los accesos Retail ahora utilizan claves independientes:

- `retail_orders`
- `retail_pos`
- `retail_products`
- `retail_suppliers`
- `retail_purchases`

Esto permite activar/desactivar cada módulo Retail desde el plan sin reutilizar de forma indirecta los permisos de Restaurante.

Los módulos generales continúan siendo:
- `dashboard`
- `cash`
- `staff`
- `settings`

## Prueba gratis
Cada tipo de negocio dispone de su propia prueba predeterminada.

La función `create_my_trial_restaurant_v3` selecciona la prueba según `business_type`.

## Compatibilidad
Los restaurantes existentes conservan sus planes y módulos anteriores.

Los negocios Retail en prueba que hubieran heredado la prueba de Restaurante fueron alineados automáticamente con la prueba correspondiente a su tipo.

## Respaldo
La copia original anterior a Retail continúa intacta:
`backup-original-pre-retail-2026-09-23`

También existe el respaldo previo a la fase de filtros del administrador:
`backup/pre-admin-mobile-filters-2026-09-23` en el repositorio de Admin.

## Landing pública

Desde 2026-09-24 la landing también respeta `business_type`:

- Restaurante carga solo planes `restaurant`.
- Retail carga solo planes `supermarket` / `minimarket` y permite elegir el tipo Retail sin mezclar categorías.
- Profesionales carga solo planes `professional`.
- Al seleccionar un plan, el registro conserva el mismo tipo de negocio.

Commit landing Restaurante: `551b3072ef508836e0e094c49a7d8fe93c02b540`.
