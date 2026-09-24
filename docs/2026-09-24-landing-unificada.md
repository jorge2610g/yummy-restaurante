# Landing unificada YummyPro — 2026-09-24

## Arquitectura
- Landing única: https://web.yummypro.online/
- Restaurante: https://web.yummypro.online/#restaurante
- Retail / Tiendas: https://web.yummypro.online/#retail
- Profesionales: https://web.yummypro.online/#profesionales

## Paneles separados
- Restaurante: https://web.yummypro.online/panel/
- Retail: https://retail.yummypro.online/panel/
- Profesionales: https://pro.yummypro.online/panel/
- Admin central: https://admin.yummypro.online/

## Comportamiento
La selección de vertical cambia colores, textos, vista previa, funciones, planes, demo, alta, login e instalación del panel. Los planes se filtran por business_type y el registro conserva el tipo seleccionado.

## Dominios antiguos de landing
- retail.yummypro.online/ redirige a la landing única en #retail.
- pro.yummypro.online/ redirige a la landing única en #profesionales.
Sus rutas /panel/ permanecen independientes.

## Admin
Abrir panel usa business_type:
- restaurant -> web.yummypro.online
- supermarket/minimarket -> retail.yummypro.online
- professional -> pro.yummypro.online

## Respaldos
Antes del cambio se creó backup/pre-unified-landing-2026-09-24 en Restaurante, Retail, Profesionales y Admin.

## Versiones
- Landing unificada: v2.1.0
- Panel Restaurante: v2.5.53
- Panel Retail: v2.5.53
- Panel Profesionales: v2.5.53
- Admin: v2.3.39
