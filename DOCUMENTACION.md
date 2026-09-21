# Documentación técnica · YummyPro Restaurante

> Guía para editar el proyecto sin tener que reconstruir su arquitectura desde cero. Actualizar este archivo cuando se agregue o cambie un módulo importante.

## Qué contiene este repositorio
Este repositorio tiene dos superficies principales:
- `index.html`: landing pública para restaurantes, planes, inicio de sesión y creación de cuenta/prueba.
- `panel/index.html`: aplicación del restaurante. Es el archivo principal del panel y concentra HTML, CSS y JavaScript.

## Flujo de inicio
El panel arranca con `body.auth-loading`. Mientras Supabase valida sesión, restaurante, rol y accesos se muestra `#appBootLoader`. Cuando la sesión ya es válida se muestra `#app` y las cargas secundarias continúan sin bloquear la interfaz.
No quitar este orden: evita que usuarios vean módulos que no corresponden a su rol durante milisegundos.

## Supabase y estado
`currentRestaurant` identifica el restaurante activo y `currentRole` el rol. Toda consulta del panel debe quedar limitada al restaurante actual.
`restoreSession()` / `enter()` recuperan la sesión.
`effectiveTabs()` y `applyRoleAccess()` deciden qué módulos se muestran según rol y suscripción.
Roles actuales: restaurant, manager, editor, cashier, kitchen, waiter y courier.

## Módulos del panel
- Dashboard: `refreshRestaurantDashboard()`, `loadDashboardOrders()`.
- Suscripción: `loadSubscriptionPlans()`, `loadSubscriptionModuleAccess()`, `renderSubscriptionBanner()`.
- Categorías: `loadCategories()`, `saveCategory()`, `editCategory()`, `deleteCategory()`.
- Productos: `loadProducts()`, `saveProduct()`, `editProduct()`, `toggleProduct()`, `deleteProduct()`.
- Inventario: `loadInventory()`, `saveInventoryItem()`, `saveInventoryMovement()`.
- Pedidos: `loadOrders()`, filtros de fecha/estado y realtime con `startRestaurantOrderRealtime()`.
- Cocina: `loadKitchen()`.
- Caja: `loadCash()`, `openCashSession()`, `addCashMovement()`, `closeCashSession()`.
- Mesero Pro/POS: `loadPos()`, `renderPosProducts()`, `renderPosCart()`, `submitWaiterOrder()`, `renderPosOrders()`.
- Configuración/pagos: Mercado Pago, pagos alternativos, logo, ubicación y datos del restaurante.

## Mesero Pro
`posCart` es el carrito temporal antes de crear una comanda.
`addPosProduct()` agrega productos y `changePosQuantity()` cambia cantidades.
`renderPosCart()` es la fuente visual del carrito y controla el botón flotante `#posCartFab`.
Regla UX importante: `#posCartFab` nace con clase `hidden` en el HTML y solo se muestra cuando el carrito tiene productos. Esto evita el destello del botón durante la primera pintura.
`openPosOrderModal()` abre un pedido existente.
`renderPosEditItems()` y `renderPosEditCatalog()` permiten editar cantidades y agregar productos.
`savePosOrderEdit()` usa RPC `update_waiter_order`.
`payPosOrder()` usa RPC `pay_waiter_order` y permite Efectivo o Tarjeta POS. Un pedido pagado no debe editarse.

## Caja y cobro
Los cobros de Mesero Pro requieren una caja abierta. El backend registra el movimiento en `restaurant_cash_movements`. No implementar el cobro solo en JavaScript: la validación crítica debe permanecer en RPC/SQL.

## Pedidos y Mercado Pago
Los pedidos online usan estados de pago independientes del estado de cocina. `isApprovedMercadoPagoOrder()` ayuda a filtrar pagos válidos. No mezclar `payment_status` con `status`: uno representa pago y el otro preparación/entrega.

## Notificaciones
El panel registra push/notificaciones y realtime. Las funciones principales incluyen `enableRestaurantNotifications()`, `registerRestaurantPush()`, `restaurantOrderAlert()` y `startRestaurantOrderRealtime()`.

## Seguridad al editar
1. Crear branch de respaldo del último commit estable.
2. Cambiar una sola función/módulo por commit cuando sea posible.
3. Incrementar la versión visible para cambios de código.
4. Nunca poner service-role, API keys privadas ni tokens secretos en HTML.
5. Mantener validaciones críticas en Supabase/RPC.
6. Probar móvil y escritorio.
7. Verificar roles restaurant/waiter/kitchen/cashier después de cambios de navegación.

## Convenciones
`toast()` muestra mensajes al usuario. `money()` formatea importes. `esc()` debe usarse al insertar texto dinámico en HTML. Las clases `.hidden`, `.card`, `.item`, `.primary`, `.ghost`, `.mut` son utilidades visuales compartidas.

## Antes de modificar Mesero Pro
Revisar juntos: HTML de `#pos`, CSS `.pos-cart*`, estado `posCart`, `renderPosCart()`, editor `#posOrderModal` y RPCs `create_waiter_order`, `update_waiter_order`, `pay_waiter_order`. Un cambio parcial puede crear diferencias entre lo mostrado y lo guardado.
