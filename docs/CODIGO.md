# Guía del código · YummyPro Restaurante

> Documento para mantenimiento humano. Actualizarlo cuando cambie la arquitectura.

## Qué contiene este repositorio
Aplicación del restaurante: landing/registro y panel operativo. El panel concentra Dashboard, pedidos, Mesero Pro/POS, cocina, caja, menú, categorías, inventario, personal, QR, planes y configuración.

## Archivos principales
- `index.html`: landing y alta del restaurante/prueba gratuita.
- `panel/index.html`: aplicación principal del restaurante. Contiene interfaz, estilos y lógica JavaScript del panel.
- `whatsapp-device-demo/`: demo aislada de conexión WhatsApp por dispositivo. No confundir con la integración oficial de Meta.

## Inicio del panel
El documento comienza con `body.auth-loading`. Mientras se valida sesión/permisos solo debe verse `#appBootLoader`. Después se quita `auth-loading`, se agrega `auth-ready` y se muestra `#app`. Esto evita mostrar módulos no autorizados durante milisegundos.

`currentRestaurant` identifica el restaurante activo y `currentRole` el rol. `roleTabs`, `applyRoleAccess()` y el acceso de suscripción deciden qué módulos puede ver cada usuario.

## Mesero Pro / POS
Estado principal:
- `products`: productos cargados.
- `posCart`: cantidades del pedido nuevo.
- `posOrders`: pedidos en local.
- `editingPosOrderId` / `editingPosItems`: pedido existente que se está editando.

Funciones clave:
- `loadPos()`: carga datos del POS.
- `renderPosProducts()`: dibuja catálogo.
- `addPosProduct()`: agrega al carrito.
- `changePosQuantity()`: cambia cantidades.
- `renderPosCart()`: recalcula contador/total y controla el botón móvil “Ver pedido”.
- `submitWaiterOrder()`: crea la comanda mediante RPC `create_waiter_order`.
- `loadPosOrders()` / `renderPosOrders()`: historial de pedidos en local.
- `openPosOrderModal()`: abre edición de una orden existente.
- `savePosOrderEdit()`: usa RPC `update_waiter_order`.
- `payPosOrder()`: usa RPC `pay_waiter_order` y registra el cobro en Caja.

Regla UX: `#posCartFab` no debe mostrarse con carrito vacío ni mientras se edita una orden.

## Pedidos y cocina
Los pedidos viven en `restaurant_orders`. Cocina modifica el flujo operativo (recibido/preparación/listo) independientemente del pago. No mezclar `status` con `payment_status`.

## Caja
Las sesiones usan `restaurant_cash_sessions` y movimientos `restaurant_cash_movements`. Un cobro de Mesero Pro exige caja abierta. Efectivo y Tarjeta POS deben conservarse como métodos distintos.

## Suscripciones y permisos
La suscripción controla módulos habilitados además del rol. No mostrar módulos antes de terminar de resolver ambos permisos. La prueba gratuita se crea con `create_my_trial_restaurant`.

## Notificaciones
Los pedidos usan tiempo real/avisos del panel. Los correos de alta/suscripción se envían mediante la Edge Function `restaurant-email-notifications`; nunca colocar claves privadas en este repositorio.

## Base de datos / seguridad
Las operaciones sensibles deben vivir en RPC/Edge Functions con validación de usuario/restaurante. No usar service-role en navegador. Antes de modificar tablas/RPC, revisar RLS y permisos.

## Cómo modificar sin romper producción
1. Crear branch de respaldo del commit estable.
2. Cambiar una sola función/módulo por vez.
3. Incrementar versión visible.
4. Hacer commit descriptivo.
5. Verificar móvil y escritorio.
6. Para POS probar: carrito vacío, agregar/quitar, crear orden, editar, pagar efectivo/POS y caja cerrada.
7. No declarar desplegado hasta verificar publicación.

## Convenciones
- `toast()`: mensajes breves al usuario.
- `esc()`: escapar contenido antes de insertarlo en HTML.
- `money()`: formato monetario.
- `hidden`: ocultación explícita.
- No eliminar validaciones del backend aunque exista validación visual en frontend.

## Integraciones
Supabase: autenticación, PostgreSQL, RPC, realtime y Edge Functions.
Mercado Pago: pagos/suscripciones según flujo configurado.
Resend: correo transaccional desde backend.
Meta/WhatsApp: integración separada; el demo por dispositivo es experimental.

## Diagnóstico rápido
Si el panel parpadea al cargar, revisar primero el CSS de `auth-loading/auth-ready` y elementos que tengan estado visible por defecto. Si un módulo aparece a un rol incorrecto, revisar `roleTabs`, acceso de suscripción y `applyRoleAccess()`. Si Mesero Pro falla, revisar consola, RPC y que exista caja abierta para cobrar.
