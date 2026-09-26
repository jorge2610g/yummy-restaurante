# Changelog YummyPro — Restaurante

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
