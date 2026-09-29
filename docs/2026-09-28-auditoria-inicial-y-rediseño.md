# Auditoría inicial y rediseño visual — 2026-09-28

## Alcance

- Repositorio: `jorge2610g/yummy-restaurante`.
- Rama de trabajo: `staging`.
- Producción (`main`) no fue modificada.
- Respaldo local verificable: `backup/staging-2.6.84-pre-audit` en el commit `2435e113c3ab5de765cd66fd574ad427cb8c2e0f`.

## Hallazgos iniciales

- La comprobación estática y de seguridad del repositorio pasa con `npm run check`.
- El panel contiene numerosas capas históricas de CSS. Eliminarlas masivamente sin una prueba visual completa sería un riesgo funcional, ya que varias corrigen casos móviles y módulos específicos.
- Se eliminó únicamente un cierre HTML `</style>` duplicado, que era inequívocamente innecesario.
- La instalación de Chromium de Playwright no pudo completarse: el archivo descargado llegó truncado. Esto bloquea la validación visual automatizada en este entorno; no constituye un fallo de la aplicación.

## Cambio aplicado

- Landing y panel reciben una capa temática centralizada que no altera JavaScript, datos, endpoints, IDs, formularios ni permisos.
- La paleta toma como referencia el azul profundo `#005581`, documentado en la guía visual pública de La Iglesia de Jesucristo de los Santos de los Últimos Días, con fondos neutros de alto contraste.
- Los títulos usan una serif de sistema y la interfaz una sans de sistema; no se incorporan fuentes, logos ni símbolos de terceros.

## Pendientes antes de Producción

1. Resolver la instalación de Chromium o ejecutar Playwright desde CI y obtener los 34 controles visuales en verde.
2. Revisar visualmente en móvil, escritorio y modo oscuro los módulos principales: menú, POS, cocina, caja, inventario, planes, QR y dominios personalizados.
3. Comparar `staging` con `main`, revisar los cambios de release y validar despliegue y backends separados.
4. No conectar ni modificar Cloudflare como parte de esta auditoría.
