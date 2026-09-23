# Infraestructura Retail / Supermercado — 2026-09-23

## Respaldo previo
Se creó la rama:

`backup/pre-retail-infra-2026-09-23`

Base exacta del respaldo:
`2610571c77c40c7ef85ffd6238aef8ecfd038171`

La rama conserva el estado anterior a cualquier cambio de supermercado/minimarket.

## Objetivo
Ampliar YummyPro para soportar distintos tipos de negocio sin romper el modo restaurante.

Tipos incorporados:
- `restaurant`
- `supermarket`
- `minimarket`

Los restaurantes existentes permanecen con `business_type = restaurant`.

## Landing
Versión: v2.0.11.

El registro permite escoger:
- Restaurante
- Supermercado
- Minimarket / Tienda

El tipo de negocio se guarda en metadata mientras se confirma el correo y después se crea el negocio mediante:
`create_my_trial_restaurant_v3`

La prueba de 30 días continúa igual y no cobra automáticamente ningún plan.

## Panel de negocio
Versión: v2.5.10.

Para supermercado/minimarket se agregaron módulos base:
- POS Retail
- Productos Retail
- Proveedores
- Compras

Los módulos tradicionales exclusivos de restaurante se ocultan en modo retail para evitar confusión.

### POS Retail
Primera implementación:
- entrada de código de barra o SKU;
- compatible con lector USB que actúa como teclado y envía Enter;
- carrito rápido;
- cantidad;
- descuento;
- efectivo;
- tarjeta POS;
- transferencia;
- QR;
- monto recibido;
- cálculo de cambio;
- venta vinculada a una caja abierta;
- descuento de stock automático;
- movimiento de caja automático;
- historial reciente de ventas.

Una venta se completa mediante RPC transaccional:
`retail_complete_sale`

Esto evita que el navegador calcule o modifique el stock por su cuenta.

### Productos Retail
Campos:
- código de barra;
- SKU;
- nombre;
- marca;
- categoría;
- unidad;
- costo;
- precio;
- stock;
- stock mínimo;
- cantidades fraccionadas;
- imagen;
- activo/inactivo.

Alta/edición:
`retail_save_product`

Ajuste controlado de stock:
`retail_adjust_stock`

### Proveedores
Directorio por negocio:
- nombre;
- RUT/NIT;
- teléfono;
- correo;
- dirección;
- notas;
- estado activo.

### Compras
Permite:
- elegir proveedor;
- documento/factura;
- agregar productos;
- cantidad;
- costo unitario;
- recibir mercadería.

RPC:
`retail_receive_purchase`

Al recibir:
1. se registra la compra;
2. se registran sus líneas;
3. aumenta el stock;
4. se actualiza el costo del producto;
5. se genera el movimiento de inventario.

## Caja existente
Retail reutiliza:
- `restaurant_cash_sessions`
- `restaurant_cash_movements`

Se agregó:
`restaurant_cash_movements.retail_sale_id`

Esto permite conservar una sola lógica de apertura/cierre de caja para restaurante y retail.

## Acceso según suscripción
No se crearon planes comerciales nuevos todavía.

La infraestructura reutiliza los módulos actuales:
- Productos Retail → permiso `products`
- POS Retail → permiso `cash`
- Proveedores → permiso `inventory`
- Compras → permiso `inventory`

Así los precios actuales no se modifican sin una decisión comercial posterior.

## Pendiente para próximas etapas
- lector de código de barras por cámara;
- devoluciones/anulación de venta con reposición de stock;
- impresión de ticket retail;
- múltiples cajas simultáneas;
- lotes y vencimiento;
- importación masiva Excel/CSV;
- catálogo global de códigos de barra;
- tienda online retail en el cliente;
- promociones retail específicas;
- compras a crédito y cuentas por pagar;
- reportes de margen y utilidad;
- separar planes comerciales retail si se decide.

## Rollback
Código:
restaurar desde `backup/pre-retail-infra-2026-09-23`.

Base de datos:
los cambios son aditivos. Antes de eliminar tablas retail se deben exportar ventas, compras y movimientos. No es necesario eliminar las tablas para volver temporalmente al frontend anterior.


## Fase 2 — cámara, ticket y devoluciones

Versión de panel: `v2.5.11`.

### Escáner con cámara
En POS Retail se agregó **📷 Cámara**.

Implementación:
- usa `BarcodeDetector` cuando el navegador lo soporta;
- solicita cámara trasera con `getUserMedia`;
- reconoce EAN-13, EAN-8, UPC, Code 128, Code 39, ITF, Codabar y QR cuando estén disponibles;
- permite escanear varios productos sin cerrar el visor;
- evita lecturas repetidas del mismo código durante un intervalo corto;
- si el navegador no soporta lectura por cámara, el lector USB/manual sigue disponible.

### Ticket retail
Se agregó impresión de ticket de 80 mm:
- negocio;
- dirección y WhatsApp;
- número de venta;
- fecha;
- productos/cantidades;
- subtotal;
- descuento;
- total;
- monto recibido;
- cambio;
- devoluciones.

Existe opción local por dispositivo:
**“Imprimir ticket automáticamente al cobrar”**.

### Devoluciones y anulación
Nuevas tablas:
- `retail_returns`
- `retail_return_items`

Nuevos campos en `retail_sales`:
- `refunded_amount`
- `refund_status`

Nueva relación de caja:
- `restaurant_cash_movements.retail_return_id`

RPC:
- `retail_return_sale_items`: devolución parcial;
- `retail_void_sale`: devuelve todo lo pendiente de una venta.

Reglas:
1. requiere caja abierta;
2. valida cantidades ya devueltas;
3. repone stock;
4. registra movimiento de inventario;
5. registra movimiento negativo en caja;
6. prorratea el descuento original;
7. una devolución total deja la venta como `voided`;
8. una devolución parcial mantiene la venta activa con `refund_status=partial`.

El dashboard retail usa **venta neta** después de devoluciones.

## Negocio de prueba creado
Se creó en producción un negocio controlado para pruebas:

- Nombre: **Minimarket Demo YummyPro**
- Slug: `minimarket-demo-yummypro`
- Tipo: `minimarket`
- 3 productos demo
- 1 proveedor demo
- 1 caja demo abierta

Códigos demo:
- `7801234500010` — Agua mineral 500 ml
- `7801234500027` — Bebida cola 1.5 L
- `7801234500034` — Arroz 1 kg

Este negocio existe para validar POS, códigos de barra, caja, tickets, compras y devoluciones desde la vista administrativa.


## Respaldo original adicional

Para garantizar que el estado anterior a todo el proyecto retail permanezca intacto se creó también:

`backup-original-pre-retail-2026-09-23`

Commit:
`2610571c77c40c7ef85ffd6238aef8ecfd038171`

## Fase 3 — tienda online integrada

Versión panel:
`v2.5.12`

### Pedidos Online

Nuevo módulo:
`retail_orders`

Funciones:
- pedidos activos;
- esperando pago;
- entregados;
- cancelados;
- todos;
- métricas de pedidos online;
- datos del cliente;
- retiro/delivery;
- productos/cantidades;
- forma y estado de pago;
- total.

Flujo:
`received → preparing → ready → delivered`

Para pagos pendientes de proveedor, el pedido permanece en `pending_payment` y no puede prepararse hasta acreditarse.

### Pagos manuales

RPC:
`retail_mark_online_order_paid`

Transferencia y otros métodos manuales pueden confirmarse desde Pedidos Online.

Efectivo se confirma al entregar y exige caja abierta. En ese momento se crea `restaurant_cash_movements.retail_online_order_id`.

Mercado Pago y QR Bolivia no pueden confirmarse manualmente: dependen del proveedor.

### Cancelación y reembolso

Pedido sin pago:
`retail_update_online_order_status(..., 'cancelled')`
libera el stock.

Mercado Pago aprobado:
`refund-retail-payment`
devuelve el pago, libera stock y cancela el pedido.

Otros pagos aprobados requieren gestionar primero el reembolso correspondiente antes de cancelar.

### Tiempo real

`retail_online_orders` y `retail_products` se añadieron a la publicación `supabase_realtime`.

El panel escucha cambios de pedidos online. Una compra nueva puede generar:
- actualización automática;
- toast;
- sonido;
- notificación del navegador.

### Web Push

`send-order-push` se amplió con:
- `retail_restaurant`: nueva compra para el negocio;
- `retail_customer`: cambio de estado para el cliente.

### Dashboard retail

Ahora combina:
- ventas POS;
- ventas online reconocidas;
- total del día;
- ticket promedio;
- métodos de pago;
- stock bajo.

Acciones rápidas:
- Pedidos Online;
- POS Retail;
- Productos Retail.

### Tienda pública

El botón “Ver menú” se reutiliza como **Ver tienda online** para negocios retail y apunta a:
`https://menu.yummypro.online/?r=<slug>`

### Backend añadido

Tablas:
- `retail_online_orders`
- `retail_online_order_items`

Campos de caja:
- `restaurant_cash_movements.retail_online_order_id`

RPC principales:
- `get_public_retail_catalog`
- `retail_create_online_order`
- `retail_get_online_order_status`
- `retail_get_my_online_orders`
- `retail_cancel_online_order`
- `retail_release_expired_online_orders`
- `retail_update_online_order_status`
- `retail_mark_online_order_paid`

Edge Functions:
- `create-retail-payment`
- `retail-payment-webhook`
- `refund-retail-payment`
- `create-retail-veripagos-payment`
- `verify-retail-veripagos-payment`

### QA backend

Se probó creación y cancelación de una compra real temporal sobre el Minimarket Demo.

Se verificó que el stock disminuye al crear la compra y vuelve exactamente a su valor inicial al cancelarla.

El pedido y los movimientos de QA se eliminaron después de la prueba.
