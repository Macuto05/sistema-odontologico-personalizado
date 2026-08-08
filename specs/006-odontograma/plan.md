# Implementation Plan: Odontograma

**Branch**: `006-odontograma` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-odontograma/spec.md`

## Summary

Reemplaza el placeholder deshabilitado "Odontograma" del panel de Atención
(005-atencion-paciente) por un gráfico dental interactivo por paciente: un diagrama de boca
completa (arcada superior e inferior) donde el odontólogo hace clic en un diente o en una de
sus 5 superficies para marcar una condición de un catálogo cerrado de 44 entradas en 8
categorías colapsables, cada una con su símbolo y color (rojo=pendiente, azul=realizado).
`Odontograma` es una "foto" del estado actual del paciente — una fila por dentición (Adulto/
Niño), no versionada por cita (research.md #2) — con un historial de auditoría append-only
(`CambioOdontograma`, research.md #3-#4) expuesto como línea de tiempo de solo lectura. Un
plan de tratamiento estructurado (`ItemPlanTratamiento`, tabla propia, research.md #5) vive en
el mismo tab y reemplaza el campo de texto libre equivalente en la pestaña Diagnóstico de
005. Igual que Antecedentes en 005, el tab Odontograma guarda de inmediato — no participa del
modelo de borrador-hasta-finalizar (research.md #6). El catálogo de condiciones y la
numeración FDI son datos estáticos del dominio, no tablas (research.md #1, #7); los símbolos
se renderizan con un componente "badge" genérico más un set acotado de SVG a medida
(research.md #8) — sin librerías nuevas.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (sin cambios respecto a features
previas).

**Primary Dependencies**: Next.js 15 (App Router), Prisma ORM, Dexie.js, Auth.js, Zod — las
mismas ya ratificadas; no se agrega ninguna dependencia nueva de paquete (los símbolos se
dibujan con SVG nativo de React, sin librería de gráficos/canvas — research.md #8).

**Storage**: PostgreSQL (servidor) + IndexedDB vía Dexie.js (cliente), local-first en su
totalidad — a diferencia de 005 (`ArchivoEstudio` online-only), esta feature no tiene ninguna
excepción de almacenamiento; todo (`Odontograma`, `CambioOdontograma`,
`ItemPlanTratamiento`) sigue el patrón estándar del proyecto.

**Testing**: Vitest (unit + integration), Playwright (e2e) — mismas herramientas que features
previas.

**Target Platform**: Web (PWA), responsive en celular/tablet/escritorio — el panel de
herramientas colapsa a drawer/modal en mobile, mismo patrón ya resuelto por `Accordion`/
`Modal` en 005.

**Project Type**: Aplicación web (mismo codebase Next.js único; esta feature no agrega
proyectos ni servicios nuevos).

**Performance Goals**: El diagrama renderiza hasta 32 dientes (vista Adulto) con su cruz de 5
superficies cada uno, más los hallazgos vigentes — todo cálculo y render es local, sin espera
de red. El historial de cambios (potencialmente grande a lo largo de los años) se consulta
paginado y solo cuando el panel se abre, nunca junto con la carga del diagrama
(research.md #3, Principio VIII).

**Constraints**: El odontograma completo (marcar/editar/eliminar hallazgos, historial, plan
de tratamiento) DEBE funcionar 100% offline (FR-018) — sin ninguna de las excepciones de
conectividad que 005 documentó para adjuntos de estudios.

**Scale/Scope**: Mismo alcance de usuario único que el resto del sistema. El catálogo de
condiciones y la numeración FDI son datos fijos (44 y 32+20 respectivamente, research.md #1,
#7); `CambioOdontograma` crece sin límite como `Cita` (research.md #3), con el mismo patrón de
pull incremental por `updatedAt`/paginado ya usado por `Paciente`/`Cita`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para `Odontograma`/`HallazgoDental` (validaciones de superficie/variante/multi-diente/exclusividad de dentición), el catálogo estático (44 entradas, 8 categorías), y los casos de uso nuevos; Playwright para las 6 user stories del spec + los 8 escenarios de `quickstart.md`, escritos antes de tocar la implementación de cada una. |
| II. Arquitectura en capas | `Odontograma`, `CambioOdontograma`, `ItemPlanTratamiento`, `CondicionOdontograma` viven en `src/domain/entities/`, sin dependencias de framework; `IOdontogramaRepository`, `ICambioOdontogramaRepository`, `IItemPlanTratamientoRepository` son los puertos, implementados por pares Prisma/Dexie (local-first, igual que `Paciente`/`Cita`). Los casos de uso en `application/use-cases` no conocen Prisma, Dexie ni SVG/React directamente. |
| III. Integridad y auditoría de datos | Cada cambio a un hallazgo queda registrado en `CambioOdontograma`, append-only, nunca sobrescrito (research.md #3, #4) — satisface el requisito de poder responder "quién cambió qué y cuándo" incluso cuando el diagrama solo muestra el estado vigente. La eliminación de `Cita.planTratamiento` (FR-017) migra cualquier valor no vacío hacia `ItemPlanTratamiento` antes de quitar la columna, en vez de descartarlo (data-model.md §Modificación a `Cita`) — ninguna Cita ya finalizada pierde información. |
| IV. Control de acceso por rol | Todas las rutas nuevas (`/api/patients/:id/odontogramas`, `/api/odontogramas`, `/api/patients/:id/odontogramas/:denticion/historial`, `/api/cambios-odontograma`, `/api/patients/:id/plan-tratamiento`, `/api/plan-tratamiento`) quedan protegidas por el mismo middleware/sesión Auth.js que el resto de `/api/*` — se agregan explícitamente al `config.matcher`, evitando el gap que se encontró y corrigió en 005 (`middleware.ts`). |
| V. Simplicidad y YAGNI | El catálogo de 44 condiciones y la numeración FDI son datos estáticos, no tablas ni configuración editable (research.md #1, #7) — proporcional a "catálogo cerrado" que el propio spec declara. Los símbolos reutilizan un componente "badge" genérico para ~30 condiciones en vez de 44 iconos a medida (research.md #8). `ItemPlanTratamiento` es una tabla plana sin relación a `Odontograma`/dentición porque ningún requisito la necesita (research.md #5). |
| VI. Consistencia de UI, responsive y design system | Reutiliza `Accordion` (panel de herramientas y leyenda, categorías colapsables) y `Modal` (selección de condición, panel lateral en mobile) ya existentes desde 005 — sin duplicarlos. El diagrama de dientes y el sistema de símbolos son componentes nuevos específicos de esta feature (`ToothSvg`, badges) documentados como extensión de `docs/design-system.md` antes de usarse, con los mismos tokens de color ya ratificados (no se inventa una paleta rojo/azul ad-hoc — se mapea a los colores semánticos existentes de error/éxito o se agregan como extensión documentada si no alcanzan). Responsive: panel de herramientas colapsa a drawer/modal en mobile (<640px), mismo patrón que el panel lateral de 005 (FR-025 de esa feature). |
| VII. Seguridad y prevención de vulnerabilidades | Prisma parametriza todo acceso nuevo. Cada operación de sync sobre `Odontograma`/`CambioOdontograma`/`ItemPlanTratamiento` valida que el recurso exista y pertenezca al `pacienteId` implícito, mismo criterio de control a nivel de registro ya aplicado en 005 a `Cita`/`ArchivoEstudio`. El servidor rechaza explícitamente cualquier operación `EDITAR`/`ELIMINAR` sobre `CAMBIO_ODONTOGRAMA` con `400` (contracts/odontograma-api.md) — el append-only se aplica en el backend, no solo en la UI. |
| VIII. Rendimiento y acceso eficiente a datos | `GET /api/patients/:id/odontogramas` no incluye `CambioOdontograma` — el historial se trae por separado y solo al abrir ese panel (research.md #3). El pull incremental de `Odontograma`/`CambioOdontograma`/`ItemPlanTratamiento` sigue el mismo patrón por `updatedAt` que `Paciente`/`Cita` (no el pull completo de `Consultorio`, impropio para entidades que crecen). El catálogo estático no genera ninguna consulta — vive en memoria del cliente. |

**Resultado (pre-diseño)**: sin desviaciones — a diferencia de 005 (que tuvo una excepción
online-only justificada para adjuntos), esta feature no introduce ninguna excepción a
Principio VIII/local-first. La única acción que toca datos de una feature ya implementada
(eliminar `Cita.planTratamiento`) está resuelta con una migración de datos explícita, no un
descarte silencioso (Principio III).

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas.
- `data-model.md` confirma que solo `CambioOdontograma` se separa en tabla propia (por ser
  append-only y crecer sin límite, Principio VIII) — el resto de datos de hallazgos vive
  embebido, igual que `Cita.recetaItems`/`estudioItems`.
- `contracts/odontograma-api.md` no agrega ningún rol ni permiso nuevo — mismas rutas
  `/api/*` protegidas por el middleware existente, con la salvedad explícita del rechazo de
  `EDITAR`/`ELIMINAR` sobre el historial de auditoría.

Sin violaciones. Complexity Tracking queda vacío — no hay ninguna desviación que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/006-odontograma/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan)
├── quickstart.md         # Fase 1 (/speckit-plan)
├── contracts/            # Fase 1 (/speckit-plan)
│   └── odontograma-api.md
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   ├── Odontograma.ts                      # NUEVO — Odontograma, HallazgoDental,
│   │   │                                        #   Superficie, EstadoColor,
│   │   │                                        #   obtenerOCrearOdontogramaVacio()
│   │   ├── CondicionOdontograma.ts              # NUEVO — catálogo estático (44 entradas),
│   │   │                                        #   CategoriaCondicion, SimboloCondicion,
│   │   │                                        #   DIENTES_ADULTO, DIENTES_NINO
│   │   ├── CambioOdontograma.ts                 # NUEVO — CambioOdontograma, TipoCambio
│   │   └── ItemPlanTratamiento.ts               # NUEVO
│   ├── repositories/
│   │   ├── IOdontogramaRepository.ts            # NUEVO (puerto)
│   │   ├── ICambioOdontogramaRepository.ts      # NUEVO (puerto) — solo `registrar`/`listar`
│   │   └── IItemPlanTratamientoRepository.ts    # NUEVO (puerto)
│   └── errors.ts                                # MODIFICADO — + OdontogramaNoEncontradoError,
│                                                 #   CondicionInvalidaError,
│                                                 #   CambioOdontogramaInmutableError
│
├── application/
│   ├── use-cases/
│   │   ├── obtenerOCrearOdontograma.ts          # NUEVO (US1, US2; research.md #10)
│   │   ├── registrarHallazgo.ts                 # NUEVO (US1) — escribe hallazgo + CambioOdontograma
│   │   ├── editarHallazgo.ts                    # NUEVO (US3)
│   │   ├── eliminarHallazgo.ts                  # NUEVO (US3)
│   │   ├── listarHistorialOdontograma.ts        # NUEVO (US4)
│   │   ├── crearItemPlanTratamiento.ts          # NUEVO (US5)
│   │   ├── editarItemPlanTratamiento.ts         # NUEVO (US5)
│   │   ├── eliminarItemPlanTratamiento.ts       # NUEVO (US5)
│   │   └── listarPlanTratamiento.ts             # NUEVO (US5)
│   └── dto/
│       └── odontogramaDto.ts                    # NUEVO — Zod para hallazgo/variante/superficie
│
├── infrastructure/
│   ├── db/
│   │   ├── dexie/
│   │   │   ├── db.ts                            # MODIFICADO — v6: tablas `odontogramas`,
│   │   │   │                                    #   `cambiosOdontograma`, `itemsPlanTratamiento`;
│   │   │   │                                    #   EntidadOutbox + 3 valores
│   │   │   ├── OdontogramaRepositoryDexie.ts     # NUEVO
│   │   │   ├── CambioOdontogramaRepositoryDexie.ts  # NUEVO
│   │   │   └── ItemPlanTratamientoRepositoryDexie.ts # NUEVO
│   │   └── prisma/
│   │       ├── OdontogramaRepositoryPrisma.ts    # NUEVO
│   │       ├── CambioOdontogramaRepositoryPrisma.ts # NUEVO
│   │       └── ItemPlanTratamientoRepositoryPrisma.ts # NUEVO
│   └── sync/
│       └── syncEngine.ts                        # MODIFICADO — pull de las 3 entidades nuevas
│
├── app/
│   ├── api/
│   │   ├── patients/[id]/odontogramas/route.ts           # NUEVO — GET
│   │   ├── odontogramas/route.ts                          # NUEVO — GET (pull global)
│   │   ├── patients/[id]/odontogramas/[denticion]/historial/route.ts  # NUEVO — GET
│   │   ├── cambios-odontograma/route.ts                   # NUEVO — GET (pull global)
│   │   ├── patients/[id]/plan-tratamiento/route.ts        # NUEVO — GET
│   │   ├── plan-tratamiento/route.ts                      # NUEVO — GET (pull global)
│   │   └── sync/route.ts                                  # MODIFICADO — 3 entidades nuevas
│   └── (shell)/citas/[id]/page.tsx                        # MODIFICADO — habilita el tab
│                                                            #   Odontograma (ya no placeholder)
│
├── components/
│   ├── odontograma/
│   │   ├── OdontogramaTab.tsx                    # NUEVO — reemplaza el placeholder
│   │   ├── DiagramaBoca.tsx                      # NUEVO — arcada superior/inferior
│   │   ├── DienteSvg.tsx                         # NUEVO — un diente: contorno + cruz de 5
│   │   │                                         #   superficies + hallazgos superpuestos
│   │   ├── PanelHerramientas.tsx                 # NUEVO — Accordion de 8 categorías
│   │   ├── ModalSeleccionCondicion.tsx           # NUEVO — catálogo + variante + multi-diente
│   │   ├── SimboloBadge.tsx                      # NUEVO — badge genérico texto+color
│   │   ├── SimboloGrafico.tsx                    # NUEVO — set acotado de símbolos SVG
│   │   ├── LeyendaOdontograma.tsx                # NUEVO
│   │   ├── HistorialOdontogramaPanel.tsx         # NUEVO
│   │   └── PlanTratamientoTabla.tsx              # NUEVO
│   ├── citas/
│   │   ├── PanelAtencion.tsx                     # MODIFICADO — habilita el tab Odontograma
│   │   └── DiagnosticoTab.tsx                    # MODIFICADO — quita el campo "Plan de
│   │                                              #   tratamiento" (FR-017)
│   └── ui/
│       # Reutiliza Accordion y Modal existentes — sin componentes de design-system nuevos
│       # más allá de lo específico de odontograma listado arriba.
│
prisma/
└── schema.prisma                                 # MODIFICADO — + Odontograma,
                                                    #   CambioOdontograma, ItemPlanTratamiento;
                                                    #   Cita.planTratamiento eliminado (con
                                                    #   migración de datos previa)
```

**Structure Decision**: Mismo codebase Next.js único de siempre, sin proyectos nuevos. La
única carpeta nueva es `src/components/odontograma/`, separada de `src/components/citas/`
porque el tab Odontograma es visualmente y funcionalmente autocontenido (no reutiliza ningún
componente interno de Diagnóstico/Receta/Estudios); las modificaciones a `PanelAtencion.tsx`/
`DiagnosticoTab.tsx` son puntuales (habilitar el tab, quitar un campo).

## Complexity Tracking

*Sin violaciones de la constitución que justificar — tabla vacía intencionalmente.*
