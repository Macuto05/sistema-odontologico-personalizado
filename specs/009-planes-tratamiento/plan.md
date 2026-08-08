# Implementation Plan: Planes de tratamiento

**Branch**: `009-planes-tratamiento` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-planes-tratamiento/spec.md`

## Summary

Habilita la pestaña "Planes" de la ficha del paciente (hoy un placeholder deshabilitado) como
vista consolidada de todas las líneas de `ItemPlanTratamiento` ya guardadas — entidad que
006-odontograma ya creó y que sigue teniendo como único origen la tabla "Plan de tratamiento"
del tab Odontograma (sin cambios: crear/editar completo/eliminar, persistencia diferida vía
"Guardar cambios"). La pestaña Planes es una consulta de solo-consulta-más-dos-campos:
muestra dos vistas de la MISMA lista (todas las líneas, y las filtradas por realizadas — sin
tabla ni entidad nueva), y permite editar únicamente dos atributos nuevos por línea —
`fechaRealizado` (completada automáticamente por un checkbox, nunca a mano) y `nota` (texto
libre) — guardados de inmediato, sin pasar por el modelo de borrador de 006. Esos dos campos
nuevos se agregan a `ItemPlanTratamiento` en sus 3 capas (Prisma, Dexie, sync).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (sin cambios).

**Primary Dependencies**: Next.js 15 (App Router), Prisma ORM, Dexie.js, Zod — las mismas ya
ratificadas; no se agrega ninguna dependencia nueva.

**Storage**: PostgreSQL (servidor) + IndexedDB vía Dexie.js (cliente), local-first — misma
entidad `ItemPlanTratamiento` de 006-odontograma, extendida con 2 columnas nuevas
(`fechaRealizado`, `nota`), sin tabla nueva.

**Testing**: Vitest (unit) para los 2 casos de uso nuevos y la reconstrucción de "Planes
Realizados" como filtro puro; Playwright (e2e) para las 4 user stories del spec.

**Target Platform**: Web (PWA), responsive en celular/tablet/escritorio — misma pestaña de la
ficha del paciente, mismo patrón de tabla ya usado por `PlanTratamientoTabla`.

**Project Type**: Aplicación web (mismo codebase Next.js único; sin proyectos nuevos).

**Performance Goals**: La pestaña Planes reutiliza la misma consulta ya existente
(`listarPorPaciente`, indexada por `pacienteId`) — "Planes Realizados" es un filtro en memoria
sobre esa misma respuesta, no una segunda consulta a la base.

**Constraints**: Debe funcionar 100% offline (mismo criterio que 006-odontograma, FR-018 de
esa spec) — consultar Planes, tildar el checkbox y editar la nota son todas operaciones
locales-first.

**Scale/Scope**: Mismo alcance de usuario único. No agrega ninguna entidad ni tabla — extiende
una ya existente con 2 columnas opcionales.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para los 2 casos de uso nuevos (`marcarRealizadoItemPlanTratamiento`, `editarNotaItemPlanTratamiento`) y para la función pura de filtrado "realizados"; Playwright para las 4 user stories del spec, escritos antes de tocar la implementación. |
| II. Arquitectura en capas | `ItemPlanTratamiento` (dominio, ya existente) se extiende sin nuevas dependencias de framework. Los 2 casos de uso nuevos viven en `application/use-cases/`, no conocen Prisma/Dexie directamente — llaman a `IItemPlanTratamientoRepository.editar()` (puerto ya existente, sin cambios de forma). |
| III. Integridad y auditoría de datos | FR-010 del spec (Planes no puede tocar fecha/diente/tratamiento ni eliminar) se aplica en la frontera de dominio, no solo en la UI: los 2 casos de uso nuevos aceptan por firma únicamente `{id, baseVersion, nota}` o `{id, baseVersion, realizado}` — no reciben ni pueden reenviar fecha/diente/tratamiento, aunque la UI de Planes tuviera un bug. `version`/`baseVersion` se sigue usando para detectar conflicto, mismo mecanismo que el resto del sistema. |
| IV. Control de acceso por rol | No se agrega ninguna ruta `/api/*` nueva — la edición sigue viajando por el mismo endpoint genérico `/api/sync` ya protegido por el middleware Auth.js existente, con el mismo esquema `editarItemPlanTratamientoInputSchema` (extendido, no reemplazado). |
| V. Simplicidad y YAGNI | "Planes Realizados" es un filtro en memoria sobre la misma lista, no una tabla/entidad ni una segunda consulta — evita cualquier posibilidad de desincronización entre las dos vistas sin agregar mecanismo nuevo. No se agrega selector manual de fecha de realización (Assumptions del spec) porque ningún requisito lo pide. |
| VI. Consistencia de UI, responsive y design system | Reutiliza el mismo patrón de tabla ya usado por `PlanTratamientoTabla` (docs/design-system.md, sin tokens nuevos) — el checkbox usa el control nativo ya estilizado en el design system si existe, o se extiende design-system.md antes de introducir uno nuevo. Responsive: mismo criterio de tabla con scroll horizontal en mobile ya resuelto por `PlanTratamientoTabla.module.css`. |
| VII. Seguridad y prevención de vulnerabilidades | Prisma parametriza el `update` extendido. La ruta de sync ya valida que el `ItemPlanTratamiento` pertenezca al `pacienteId` implícito (control a nivel de registro, sin cambios). |
| VIII. Rendimiento y acceso eficiente a datos | Cero consultas nuevas: la pestaña Planes reutiliza `listarPorPaciente` (ya paginado/indexado por `pacienteId`); "Planes Realizados" no dispara una consulta aparte. |

**Resultado (pre-diseño)**: sin desviaciones — extiende una entidad y un flujo ya existentes,
no introduce infraestructura nueva.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `quickstart.md`): el diseño resultante no
introduce violaciones nuevas — no se generó `contracts/` porque esta feature no agrega ni
modifica ninguna ruta HTTP (Fase 1, punto 2: "Skip if project is purely internal" no aplica
literalmente, pero el motivo es el mismo — no hay contrato de API nuevo que documentar, todo
pasa por el endpoint de sync genérico ya contractado en 006-odontograma).

Sin violaciones. Complexity Tracking queda vacío.

## Project Structure

### Documentation (this feature)

```text
specs/009-planes-tratamiento/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── checklists/
│   └── requirements.md  # Ya generado (/speckit-specify)
└── tasks.md             # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── entities/
│       └── ItemPlanTratamiento.ts               # MODIFICADO — + fechaRealizado, nota;
│                                                 #   DatosEdicionItemPlanTratamiento extendido
│
├── application/
│   ├── use-cases/
│   │   ├── marcarRealizadoItemPlanTratamiento.ts  # NUEVO — checkbox (US2)
│   │   └── editarNotaItemPlanTratamiento.ts       # NUEVO — nota (US4)
│   └── dto/
│       └── odontogramaDto.ts                    # MODIFICADO — + fechaRealizado/nota en los
│                                                 #   schemas Zod de plan de tratamiento
│
├── infrastructure/
│   └── db/
│       ├── dexie/
│       │   └── ItemPlanTratamientoRepositoryDexie.ts   # MODIFICADO — editar() suma los 2
│       │                                               #   campos (mismo patrón condicional
│       │                                               #   ya usado para `diente`); sin bump
│       │                                               #   de version() de Dexie — no se
│       │                                               #   indexan, se filtran en memoria
│       └── prisma/
│           └── ItemPlanTratamientoRepositoryPrisma.ts  # MODIFICADO — mismo patrón en
│                                                        #   `editar()` y en el mapeo a dominio
│
├── app/
│   └── (shell)/pacientes/[id]/page.tsx          # MODIFICADO — habilita la pestaña "Planes"
│                                                 #   (hoy `deshabilitada: true`), renderiza
│                                                 #   PlanesTab
│
└── components/
    └── planes/
        ├── PlanesTab.tsx                         # NUEVO — consulta listarPorPaciente,
        │                                         #   arma las 2 vistas (todos/realizados)
        ├── TablaPlanes.tsx                       # NUEVO — tabla presentacional reutilizada
        │                                         #   por ambas vistas (recibe items + callbacks)
        └── PlanesTab.module.css                  # NUEVO

prisma/
├── schema.prisma                                 # MODIFICADO — + fechaRealizado (Date?),
│                                                  #   nota (String?) en ItemPlanTratamiento
└── migrations/<timestamp>_planes_tratamiento/     # GENERADO por `prisma migrate dev`
```

**Structure Decision**: Mismo codebase Next.js único. Única carpeta nueva:
`src/components/planes/` — separada de `src/components/odontograma/` porque, aunque comparten
la entidad `ItemPlanTratamiento`, son pantallas y flujos de interacción distintos (una crea,
la otra solo consulta + 2 campos), consistente con cómo 006-odontograma ya separó
`odontograma/` de `citas/`. No se toca `PlanTratamientoTabla.tsx` — sigue siendo el único
punto de creación/edición completa/eliminación, sin cambios de comportamiento (FR-011).

## Complexity Tracking

*Sin violaciones de la constitución que justificar — tabla vacía intencionalmente.*
