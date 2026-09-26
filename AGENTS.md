# AGENTS.md — Reglas de desarrollo YummyPro Restaurante

Estas reglas aplican a cualquier agente de IA o desarrollador que modifique este repositorio.

## Regla obligatoria de ambientes y releases

- **No modificar `main` directamente.** Todo trabajo cotidiano se hace en `staging`.
- Solo el propietario autoriza un cambio a Producción mediante **Lanzar a Producción**.
- Si una petición no dice explícitamente que se haga release, se interpreta como cambio exclusivo de Pruebas.
- Mantener separados los datos: Pruebas usa Supabase `wodqqheeesrelsbacmgx`; Producción usa `gulctljitzlwokqydigx`.
- Solo el hostname oficial de Producción puede usar el backend de Producción; GitHub Pages de pruebas, localhost y hosts no reconocidos deben usar Staging.
- Cada cambio visible o funcional debe incrementar la versión de patch como mínimo, actualizar `VERSION` y registrarse en `CHANGELOG_YUMMYPRO.md`.
- Antes de considerar un cambio listo, `quality` y `smoke` deben estar en verde.
- Después de un release se verifican SHA, versión, deploy y backend. Inmediatamente después del release, `main` y `staging` deben coincidir.
- Nunca copiar usuarios, pedidos, clientes, inventario ni otros datos de Pruebas a Producción durante un release.
- Leer `YUMMYPRO_WORKFLOW.md` antes de cambiar arquitectura, despliegues o configuración de ambiente.

## Método de trabajo

1. Inspeccionar el flujo existente antes de editar.
2. Hacer el cambio mínimo necesario en `staging`.
3. No romper funciones ya operativas.
4. Actualizar versión y changelog.
5. Ejecutar/revisar pruebas automáticas.
6. Dejar el cambio pendiente en Pruebas hasta que el propietario ordene release.
