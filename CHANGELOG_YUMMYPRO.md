## 2.6.83 — 2026-09-28 — Pruebas
- Se completó la activación end-to-end de dominios personalizados en Staging.
- Se corrigió el permiso interno de `service_activate_business_custom_domain` usando `SECURITY DEFINER` sin abrir el esquema `private` a roles públicos.
- Se corrigió la activación para actualizar únicamente la fila vigente del hostname y no filas históricas deshabilitadas.
- Se confirmó `prueba.expressdelivery.pro` con estado `active`, SSL `active` y respuesta HTTPS 200.
- Se documentó el requisito del CNAME target proxied `domains-pruebas.yummypro.online`.
- Producción no fue modificada.

## 2.6.83 — 2026-09-28 — Pruebas
- Se corrigió la validación SSL de dominios personalizados en Cloudflare for SaaS.
- Se creó el CNAME target de Staging `domains-pruebas.yummypro.online` apuntando al fallback origin proxied `domains.yummypro.online`.
- El reconciliador ahora crea rutas Worker de exclusión para `/.well-known/acme-challenge/*` y `/.well-known/pki-validation/*`, evitando que el Worker intercepte los desafíos DCV.
- Cuando se corrigen esas rutas, el reconciliador reinicia la validación DCV del Custom Hostname.
- Se amplió el diagnóstico del reconciliador para registrar estado del hostname, SSL, CA y validation records.
- Producción no fue modificada.

## 2.6.82 — 2026-09-28 — Pruebas
- Se corrigió el estado “Recuperando tu dominio…” que podía quedar fijo si el módulo cargaba antes de que el panel terminara de identificar el negocio.
- El módulo ahora espera a Supabase/currentRestaurant y reintenta automáticamente hasta poder recuperar el dominio guardado.
- Mientras termina de cargar muestra “Preparando tu información…” en lugar de aparentar que el proceso quedó congelado.
- Se mantiene la verificación automática y la persistencia introducidas en 2.6.81.
- Producción no fue modificada.

## 2.6.81 — 2026-09-28 — Pruebas
- El dominio personalizado conserva hostname y estado al recargar el panel.
- Se añadió una barra de progreso con etapas: dominio guardado, DNS verificado, HTTPS listo y activo.
- El botón de conexión queda bloqueado mientras existe un dominio en proceso para evitar solicitudes duplicadas.
- El panel consulta automáticamente el estado del dominio y mantiene un botón manual “Comprobar ahora” como respaldo.
- Se añadió la Edge Function `reconcile-business-domains` y un cron de Staging cada 2 minutos para verificar DNS/Cloudflare/SSL incluso con el panel cerrado.
- Se corrigió la validación de hostnames y la reconexión del mismo dominio ahora conserva el token TXT.
- Se documentó el flujo completo en `docs/CUSTOM_DOMAINS.md`.
- Producción no fue modificada.

## 2.6.80 — 2026-09-28 — Pruebas
- Tras verificar DNS, el panel inicia el aprovisionamiento seguro del hostname y SSL en backend.
- Producción no fue modificada.

## 2.6.79 — 2026-09-27 — Pruebas
- Se reposicionó el botón flotante “Reportar problema” en escritorio para que no tape accesos del menú lateral, incluido QR de Mesa.
- En menú expandido y contraído el botón queda fuera de la barra lateral.
- Producción no fue modificada.

# Changelog YummyPro — Restaurante

## 2026-09-26 — 2.5.75 — Pruebas

- Se añadió el switch **Marca blanca / White Label** dentro de Marca/Apariencia.
- Al activarlo, la web pública oculta referencias visibles a YummyPro y conserva únicamente nombre, logo y colores del negocio.
- La opción queda marcada como **PLUS** para poder ofrecerla como adicional comercial.
- La configuración se guarda por negocio en `white_label_enabled`.
- Producción no fue modificada.

## 2026-09-25/26 — 2.5.74 — Pruebas

- Se añadieron interruptores independientes para **Retiro en el local** y **Delivery**.
- El restaurante puede habilitar solo retiro, solo delivery o ambos; no se permite dejar ambos apagados.
- Al desactivar Delivery se ocultan sus campos de precio, ubicación y rangos para simplificar la configuración.
- Se añadió la migración de Supabase `pickup_enabled` / `delivery_enabled` con validación de al menos un método activo.
- La migración fue aplicada únicamente en **YummyPro Staging**. Producción queda pendiente hasta que el propietario autorice el próximo release.
- Los enlaces del panel Restaurante ahora respetan el ambiente: Pruebas abre landing/cliente de Pruebas y Producción abre los dominios de Producción.

## 2026-09-25/26 — 2.5.73 — Pruebas

- Se formalizó el flujo **Pruebas → Release → Producción**.
- Se prohibieron cambios directos en `main` durante el desarrollo normal.
- Se documentó separación de Supabase entre Pruebas y Producción.
- Se añadió selección segura del backend por hostname: Producción usa `gulctljitzlwokqydigx`; Pruebas usa `wodqqheeesrelsbacmgx`.
- Se reforzó el control de versión y la obligación de documentar cambios.
- Este cambio permanece en `staging` hasta que el propietario autorice el próximo release.

### Nota operativa
El primer release permitió validar el mecanismo de promoción. La revisión posterior detectó que el código promovido conservaba el endpoint de Supabase Staging. La corrección de enrutamiento por ambiente se hizo únicamente en Pruebas y deberá llegar a Producción mediante un release explícito.
