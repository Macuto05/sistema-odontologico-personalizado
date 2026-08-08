# Quickstart: Indicador de Estado de Sincronización

## Prerrequisitos

- Seguir la puesta en marcha del `README.md` del proyecto (DB, `prisma migrate dev`, seed,
  `.env`).
- El comportamiento offline solo se puede validar contra un **build de producción** (el
  Service Worker está deshabilitado en desarrollo) — ver README.md, sección "Build de
  producción / prueba del comportamiento offline":

  ```bash
  npm run build
  npm run start
  ```

## Escenario 1 — Offline en cualquier pantalla (US1, FR-002, FR-003, FR-010)

1. Iniciar sesión y abrir cualquier pantalla que **no** tenga la barra superior existente
   (ej. la ficha de un paciente, `/pacientes/[id]`).
2. Confirmar que el indicador es visible en la esquina superior derecha, en estado "Con
   conexión".
3. DevTools → Network → Offline (o modo avión).
4. **Esperado**: el indicador cambia a "Sin conexión" sin recargar la página.
5. Crear o editar un registro (ej. archivar un insumo) mientras sigue offline.
6. Hacer click en el indicador. **Esperado**: el panel muestra la cantidad de cambios
   guardados localmente pendientes de enviar.
7. Volver a activar la conexión. **Esperado**: el indicador pasa a "Sincronizando" y luego a
   "Con conexión", sin recargar.

## Escenario 2 — Progreso de envío (US2, FR-004, FR-005, FR-006)

1. Offline, generar varios cambios (ej. crear 5 pacientes).
2. Reconectar.
3. **Esperado**: el indicador muestra "Sincronizando NN%" con el porcentaje avanzando (no
   estático) hasta llegar a un punto en que deja de mostrar el %, mientras trae cambios del
   servidor.
4. Cuando termina, **esperado**: el indicador queda en "Con conexión"; al hacer click, el
   panel muestra una fecha reciente de "última sincronización".

## Escenario 3 — Conflicto (US3, FR-007, FR-008)

1. Con dos pestañas/sesiones autenticadas contra el mismo usuario (o dos dispositivos):
   editar el mismo paciente desde ambas sin recargar la otra.
2. Reconectar/guardar en ambas. **Esperado**: una de las dos operaciones queda en conflicto en
   el servidor.
3. **Esperado**: el indicador de la sesión afectada pasa a estado de alerta ("N con
   conflicto") en cuanto termina el ciclo de sync (no antes, no durante el envío).
4. Hacer click. **Esperado**: el panel lista el paciente afectado y el tipo de operación
   (ej. "editar").
5. Navegar a otra pantalla del sistema. **Esperado**: el estado de alerta se sigue mostrando.

## Validación automatizada (referencia)

- Unit (Vitest): `derivarEstadoSync()` (las 4 transiciones de estado y su prioridad,
  data-model.md) y el store `syncStatus.ts` (iniciar/actualizar/limpiar/suscribir) — ambos son
  lógica pura en memoria, sin Dexie ni red, mismo criterio que el resto de la lógica de
  dominio del proyecto.
- E2E (Playwright, contra build de producción, `context.setOffline()` — mismo patrón que
  `tests/e2e/offline-sync.spec.ts`): todo lo que sí toca IndexedDB real o el navegador
  (Escenarios 1, 2 y 3 completos), en una pantalla con `TopAppBar` y en una sin él. El
  proyecto no usa un shim de IndexedDB en Vitest (no hay `fake-indexeddb` instalado) — lo que
  toca Dexie se valida en un navegador real vía Playwright, no en Vitest.
