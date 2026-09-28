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
