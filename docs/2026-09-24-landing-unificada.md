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

## Login universal — v2.1.1
El botón Iniciar sesión ya no depende de la vertical que el visitante está viendo.

Flujo:
1. Autentica correo y contraseña.
2. Verifica que la cuenta sea de negocio.
3. Busca el negocio activo asociado en restaurant_staff/restaurants.
4. Lee business_type.
5. Redirige automáticamente:
   - restaurant -> https://web.yummypro.online/panel/
   - supermarket/minimarket -> https://retail.yummypro.online/panel/
   - professional -> https://pro.yummypro.online/panel/
6. Si la cuenta todavía no tiene negocio porque está pendiente de completar la prueba tras confirmar correo, usa trial_business_type del metadata para enviarla al panel correcto.

“Ir a mi panel” usa la misma resolución universal. La selección Restaurante / Retail / Profesionales de la landing solo cambia la experiencia visual, registro nuevo, demos y planes; ya no restringe el inicio de sesión.

Respaldo previo: backup/pre-universal-login-2026-09-24.

## Traspaso de sesión entre dominios — v2.1.2 / paneles v2.5.54
Problema corregido: la autenticación de Supabase se guarda por origen del navegador. Iniciar sesión en web.yummypro.online no creaba automáticamente una sesión en retail.yummypro.online o pro.yummypro.online.

Solución:
- La landing autentica una sola vez.
- Detecta business_type y el panel destino.
- Pasa access_token/refresh_token en el fragmento (#) con claves yummy_access/yummy_refresh.
- El panel destino consume el fragmento, lo elimina inmediatamente de la URL, llama sb.auth.setSession() y entra directamente al Dashboard.
- El formulario de login del panel solo aparece si no existe una sesión válida.
- “Ir a mi panel” y el registro con sesión inmediata usan el mismo handoff.

Respaldo previo: backup/pre-universal-session-handoff-2026-09-24.

## Estabilización visual de autenticación — v2.1.3
Se eliminó el parpadeo observado al recargar la landing con una sesión existente.

Cambios:
- La landing inicia con estado `landing-auth-pending`.
- Los controles dependientes de sesión conservan su espacio pero permanecen ocultos hasta resolver Supabase Auth.
- `syncLandingSession()` usa una promesa single-flight para evitar resoluciones concurrentes.
- Cambiar entre Restaurante / Retail / Profesionales ya no vuelve a consultar la sesión ni provoca parpadeos.
- Cuando el estado queda resuelto se muestran directamente los controles correctos: visitante o “Ir a mi panel”.
- El handoff universal hacia el panel se mantiene intacto.

Respaldo previo: `backup/pre-auth-flicker-fix-2026-09-24`.
