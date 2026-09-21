# Guía técnica · YummyPro Restaurante

> Documento para mantenimiento humano. Actualizado: 21-09-2026.

## Propósito
Este repositorio contiene la landing de alta de restaurantes y el panel operativo del restaurante. El panel reúne Dashboard, Pedidos, Mesero/POS, Cocina, Caja, Menú, Inventario, Personal, QR, Planes y Configuración.

## Archivos principales
- `index.html`: landing/alta del restaurante y prueba gratuita.
- `panel/index.html`: aplicación principal del restaurante. Actualmente concentra HTML, CSS y JavaScript del panel.
- `whatsapp-device-demo/`: demo aislada de conexión de WhatsApp por dispositivo; no confundir con la integración oficial de Meta.

## Cómo leer panel/index.html
El archivo está organizado por capas aunque hoy sea monolítico:
1. **CSS y responsive**: estilos generales y ajustes de móvil.
2. **HTML del panel**: secciones identificadas por IDs como dashboard, orders, pos, kitchen y cash.
3. **Estado global JS**: restaurante activo, rol, productos, pedidos, carrito POS, etc.
4. **Autenticación/permisos**: carga sesión, membresía, plan y módulos visibles.
5. **Funciones por módulo**: cada sección carga/renderiza/actualiza sus datos.
6. **Realtime**: escucha cambios de pedidos y suscripción.

## Mesero / POS
Busca estas funciones para mantener el flujo:
- `loadPos()`: carga productos y datos necesarios.
- `renderPosProducts()`: dibuja catálogo del mesero.
- `addPosProduct()`: agrega un producto al carrito.
- `changePosQuantity()`: cambia cantidades.
- `renderPosCart()`: recalcula carrito, contador, total y visibilidad del botón móvil.
- `submitWaiterOrder()`: crea la comanda mediante RPC.
- `loadPosOrders()` / `renderPosOrders()`: historial de pedidos en local.
- `openPosOrderModal()`: abre edición de un pedido existente.
- `savePosOrderEdit()`: guarda edición mediante `update_waiter_order`.
- `payPosOrder()`: cobra mediante `pay_waiter_order`.

### Regla importante del botón “Ver pedido”
En móvil el FAB debe existir visualmente **solo cuando el carrito tenga productos** y nunca debe quedar encima del editor de pedidos. Evitar mostrarlo por defecto antes de que JavaScript calcule el carrito, porque produce un flash durante el arranque.

## Cocina y pedidos
El estado de preparación y el estado de pago son conceptos independientes. Cocina mueve el pedido por sus estados operativos; cobrar una mesa actualiza el estado de pago y Caja.

## Caja
Las ventas del Mesero/POS deben registrarse en la sesión de caja abierta. No permitir cobros silenciosos fuera de una caja abierta.

## Roles
Los módulos visibles dependen de `currentRole`, `roleTabs` y del acceso de suscripción. No mostrar primero todos los módulos y ocultarlos después: validar acceso antes de liberar la interfaz.

## Supabase
Este frontend depende de tablas/RPC/Realtime de Supabase. Funciones relevantes del Mesero:
- `create_waiter_order`
- `update_waiter_order`
- `pay_waiter_order`

No poner claves service-role en este repositorio. Las operaciones privilegiadas deben permanecer en SQL seguro o Edge Functions.

## Suscripciones y correo
El alta usa `create_my_trial_restaurant`. Los correos automáticos se procesan en backend; el frontend no debe contener la API key de Resend.

## Regla de cambios
Antes de producción: crear backup de `main`, incrementar versión visible, hacer un cambio acotado, commit separado y verificar despliegue. No interpretar “sin checks” como despliegue exitoso.
