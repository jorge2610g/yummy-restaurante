# YummyPro — Landing y Panel del Restaurante

## Propósito
Este repositorio contiene la landing comercial para restaurantes y el panel operativo de cada restaurante.

## Landing comercial
- Diseño profesional y responsivo para escritorio/móvil.
- Registro e inicio de sesión de restaurantes.
- Flujo de prueba gratuita.
- Sección pública “Planes y precios” conectada a `subscription_plans`.
- Muestra nombre, precio, duración y detalle de módulos de cada plan activo.
- CTA “Crear cuenta y elegir este plan”.
- Flujo recomendado: crear cuenta/restaurante primero y después pagar para asociar correctamente la suscripción.
- Después del registro puede abrir directamente la sección Planes con el plan seleccionado.
- Corrección móvil para mostrar todos los planes uno debajo de otro.
- Versiones recientes de landing: v2.0.3 (planes públicos) y v2.0.4 (responsive de planes).

## Panel del restaurante
- Acceso separado por rol.
- Oculta el panel mientras valida sesión, restaurante, permisos y suscripción para evitar parpadeos de módulos no autorizados.
- Productos y categorías.
- Código QR y acceso al menú público.
- Configuración del negocio, apertura/cierre y datos del local.
- Pedidos y estados.
- Cocina.
- Meseros/POS.
- Caja e historial.
- Inventario.
- Personal y roles.
- Planes/suscripciones.
- Diseño responsive y mejoras de navegación móvil.

## Roles
Se implementaron permisos por rol para restaurante/manager/editor/cashier/kitchen/waiter/courier. La navegación efectiva respeta los permisos del rol y, para restaurante/manager, también los módulos habilitados por la suscripción.

## Suscripciones y módulos
- Acceso efectivo = permisos del rol ∩ módulos habilitados por la suscripción.
- Los planes son configurables desde administración; no dependen de nombres hardcodeados.
- La prueba de 30 días habilita lo básico para comenzar: productos, categorías, QR y configuración del sitio; Planes permanece disponible para contratar.
- Al expirar/suspender una suscripción se restringen los módulos correspondientes.
- Al cambiar a un plan inferior desaparecen los módulos que ya no estén incluidos.
- La página de Planes detalla los módulos incluidos para facilitar la comparación.
- Se admite configuración/accesos especiales por restaurante desde administración.

## Mercado Pago — planes
Hay dos modalidades:
1. **Pagar plan:** pago único; al vencer debe pagarse nuevamente.
2. **Suscripción automática:** autorización recurrente para cobros periódicos.

Regla crítica: ambos flujos de suscripción usan las credenciales centrales del administrador/Express, NO las credenciales Mercado Pago del restaurante.

Funciones backend relacionadas:
- `create-subscription-payment`: pago único.
- `create-recurring-subscription`: suscripción recurrente.
- `mercadopago-webhook`: confirmación/actualización de estados.

Se agregó seguimiento de suscripción Mercado Pago en restaurantes y pagos. Los webhooks activan/renuevan cuando corresponde y pueden suspender ante estados de cobro rechazados/cancelados según el flujo implementado.

## Mercado Pago — pedidos
Es un circuito distinto al de suscripciones:
- Cada restaurante utiliza sus propias credenciales para cobrar pedidos de sus clientes.
- Los pedidos online operativos deben mostrarse como pagados cuando Mercado Pago los confirma como aprobados.
- No mezclar credenciales de pedidos con credenciales centrales de suscripciones.

## Operación
- Pedidos de cocina son internos del restaurante y distintos del historial de pagos online.
- Los pedidos de mesa pueden mostrar el mesero responsable.
- Se incorporaron caja, cocina, inventario, opciones de producto, roles de personal, POS y navegación específica por rol.

## Versionado y rollback
Cada cambio funcional debe tener versión visible nueva y commit independiente para permitir rollback. Entre hitos recientes del panel están v2.3.3–v2.3.15 y de la landing v2.0.3–v2.0.4.

## Repositorios relacionados
- Menú/cliente: `jorge2610g/mipagina`
- Administración global: `jorge2610g/yummy-admin`

## Seguridad
No colocar Access Tokens de Mercado Pago, Service Role Keys, contraseñas ni secretos en frontend, README o commits.
