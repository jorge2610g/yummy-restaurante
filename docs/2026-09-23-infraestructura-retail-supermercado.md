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
