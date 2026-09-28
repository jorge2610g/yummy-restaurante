# Dominios personalizados

Última actualización: 2026-09-28.

## Alcance

La función está en pruebas sobre **Staging**. No se ha promovido a Producción.

El dominio personalizado está disponible solo para negocios con plan **Pro** activo.

## Flujo de Staging

1. El negocio registra un hostname desde el panel.
2. YummyPro genera un TXT de verificación y un CNAME.
3. El CNAME de pruebas apunta a `domains-pruebas.yummypro.online`.
4. `verify-business-domain` valida TXT y CNAME.
5. `provision-business-domain` crea o recupera el Cloudflare Custom Hostname.
6. Para Staging se asegura una Worker Route hacia `yummypro-custom-domain-staging`.
7. Cuando Cloudflare reporta hostname y SSL activos, el dominio pasa a `active`.

## Cloudflare Staging

Worker separado:

`yummypro-custom-domain-staging`

Variables requeridas en el Worker:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `CLIENT_ORIGIN`
- `STREAMING_ORIGIN`

Secretos/variables requeridos por la Edge Function:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`

El token debe permitir administrar Custom Hostnames/SSL y Workers Routes en la zona usada por YummyPro.

## Correcciones aplicadas durante la prueba

- Se corrigió `business_custom_domains_hostname_normalized`: la expresión anterior podía rechazar hostnames válidos que contenían la letra `s`.
- Se agregó `resolve_business_custom_domain(hostname)` para resolver de forma pública y limitada el negocio correspondiente a un dominio activo.
- `request_business_custom_domain` ahora es idempotente: reconectar el mismo hostname conserva el token TXT existente.
- `provision-business-domain` ahora recupera un Custom Hostname ya existente antes de intentar crearlo otra vez y guarda el `provider_hostname_id` antes de configurar la Worker Route.

## Prueba end-to-end actual

Negocio de prueba: `Staging Restaurante` (ID 9101), activado temporalmente como Pro en Staging.

Hostname usado:

`prueba.expressdelivery.pro`

Estado al cierre de esta actualización:

- TXT verificado.
- CNAME verificado.
- Cloudflare Custom Hostname creado.
- Worker de Staging creado y operativo.
- Worker Route dejó de fallar.
- Estado en base: `provisioning`.
- SSL: `initializing`.
- Falta esperar a que Cloudflare marque hostname + SSL como `active`, volver a ejecutar la verificación y confirmar acceso HTTPS al menú correcto.

## Regla de seguridad

No editar ni reutilizar el Worker de Producción `yummypro-custom-domain-gateway` para pruebas de Staging.


## Verificación automática y persistencia del panel

Desde 2026-09-28 Staging ya no depende del botón manual para completar el dominio:

- El panel recupera el hostname y el estado desde Supabase al cargar o recargar.
- También conserva localmente el último hostname para evitar que el campo aparezca vacío mientras carga.
- Si existe un dominio pendiente, el botón de conectar queda bloqueado y cambia a **Esperando DNS** o **Dominio en proceso**; esto evita crear solicitudes duplicadas.
- El panel muestra una barra de progreso y cuatro etapas: Dominio guardado → DNS verificado → HTTPS listo → Activo.
- Mientras el panel está abierto, consulta el estado aproximadamente cada 12 segundos y ejecuta comprobaciones automáticas con throttling.
- El botón manual se mantiene como **Comprobar ahora** solo como respaldo.

Además existe la Edge Function `reconcile-business-domains`, protegida por un secreto interno de Vault y ejecutada por `pg_cron` cada 2 minutos en Staging. Esto permite que DNS/Cloudflare/SSL continúen reconciliándose aunque el usuario cierre el panel.

Cron de Staging:

`reconcile-business-domains-staging` → `*/2 * * * *`

La función procesa dominios en `pending_dns`, `dns_verified`, `provisioning` o `failed`, verifica TXT/CNAME, recupera o crea el Custom Hostname de Cloudflare, asegura la Worker Route de Staging y activa el dominio cuando hostname + SSL están `active`.

El token interno del cron nunca debe documentarse ni exponerse; se guarda como `custom_domain_reconcile_token` en Supabase Vault.


## Corrección SSL/DCV — 2.6.83

Cloudflare for SaaS usa HTTP DCV para los certificados de Staging. El CNAME target de pruebas debe existir públicamente y estar proxied:

`domains-pruebas.yummypro.online -> domains.yummypro.online`

Además, las Worker Routes de cada Custom Hostname deben excluir estas rutas de validación:

- `<hostname>/.well-known/acme-challenge/*` → sin Worker
- `<hostname>/.well-known/pki-validation/*` → sin Worker
- `<hostname>/*` → `yummypro-custom-domain-staging`

Las exclusiones específicas tienen prioridad sobre la ruta general y permiten que Cloudflare sirva los tokens DCV desde el edge. El reconciliador asegura estas rutas y refresca la validación cuando las corrige.
