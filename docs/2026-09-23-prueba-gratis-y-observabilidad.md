# Registro técnico — Landing y panel restaurante
Fecha: 2026-09-23

## Respaldo
Rama previa a los cambios:
`backup/pre-observability-2026-09-23`

## Landing restaurante
Versión: v2.0.9.

### Cambios
- Se ocultó la tarjeta pública separada **“Prueba 30 días / Gratis”**.
- La prueba continúa existiendo internamente como plan predeterminado de 30 días.
- La grilla pública muestra solamente Básico, Standar y Pro.
- El CTA de cada plan pasa a **“Prueba 30 días gratis”**.
- Al pulsar un plan se guarda el plan que interesó al visitante.
- Crear una cuenta no cobra el plan seleccionado; activa la prueba gratuita.
- Cuando la cuenta requiere confirmación de correo, se guardan en metadata el restaurante, país y plan de interés. Al entrar posteriormente, el panel crea automáticamente el restaurante y la prueba.
- Si la landing reconoce una sesión que ya posee restaurante, muestra **“Ir a mi panel”** en lugar de pedir crear otra cuenta.
- Se mantiene **Iniciar sesión** para cuentas existentes.

### Telemetría landing
Se registran:
- vista de landing;
- interés por plan;
- inicio/completado de registro;
- inicio de sesión correcto;
- errores de autenticación;
- errores JavaScript.

Credenciales incorrectas se clasifican como error de uso y no como fallo del sistema.

## Panel restaurante
Versión: v2.5.09.

### Cambios
- Registro de sesión y módulo utilizado.
- Registro de fallos de carga, excepciones JavaScript y rechazos no controlados.
- Login clasifica credenciales incorrectas como error de uso.
- El flujo posterior a confirmación de correo utiliza `create_my_trial_restaurant_v2` y conserva país/plan de interés.
- Se agregó botón flotante **“⚠ Reportar problema”**.
- El formulario permite indicar título y descripción.
- El reporte queda visible en el dashboard administrador.
- El administrador recibe un aviso por correo cuando llega un reporte manual.
- Los fallos técnicos repetidos activan el mecanismo de alerta global.

## Eliminado
- Se eliminó únicamente la presentación pública de la prueba gratuita como tarjeta de plan independiente.
- No se eliminó el plan técnico de prueba de la base de datos.
- No se modificaron productos, pedidos, caja, inventario ni suscripciones históricas.

## Datos que NO deben registrarse
La instrumentación no debe guardar:
- contraseñas;
- Access Tokens;
- claves API;
- credenciales bancarias;
- datos completos de tarjetas.

## Rollback
Volver a `backup/pre-observability-2026-09-23` para recuperar el frontend anterior. La migración de telemetría es aditiva y puede permanecer sin afectar el funcionamiento anterior.
