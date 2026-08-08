# Implementation Plan: Historia Clínica del Paciente

**Branch**: `003-historia-clinica-paciente` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-historia-clinica-paciente/spec.md`

## Summary

Agrega una sección de historia clínica (antecedentes personales patológicos vía checklist
predefinido de 21 ítems + "Otros" con texto libre, antecedentes heredofamiliares,
medicamentos actuales y alergias) a la ficha de paciente ya existente
(`001-gestion-pacientes`). Técnicamente se implementa extendiendo la entidad `Paciente` con
4 campos nuevos — no una entidad ni repositorio separados — porque la historia clínica es
un estado actual 1:1 con el paciente, sin versionado propio (research.md #1). Se reutiliza
íntegramente la arquitectura, el stack y los endpoints de API ya establecidos en 001;
únicamente se agregan dos componentes de UI (`Checkbox`, `Textarea`) que el design system
aún no cubre.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (sin cambios respecto a 001)

**Primary Dependencies**: Next.js 15 (App Router), Prisma ORM, Dexie.js, Auth.js, Zod — las
mismas de 001; no se agrega ninguna dependencia nueva para esta feature.

**Storage**: PostgreSQL (servidor) + IndexedDB vía Dexie.js (cliente) — mismos almacenes de
001, extendidos con 4 columnas/propiedades nuevas en `Paciente` (ver `data-model.md`).

**Testing**: Vitest (unit + integration), Playwright (e2e) — mismas herramientas que 001.

**Target Platform**: Web (PWA), responsive en celular/tablet/escritorio — sin cambios.

**Project Type**: Aplicación web (mismo codebase Next.js de 001; esta feature no agrega
proyectos ni servicios nuevos).

**Performance Goals**: Sin cambios respecto a 001 — lecturas/escrituras de UI contra Dexie
local; los 4 campos nuevos viajan en el mismo payload de `Paciente` que ya se sincroniza,
sin requests adicionales (research.md #7).

**Constraints**: Debe funcionar completamente offline (igual que 001, mismo mecanismo de
outbox/sync, sin cambios); áreas táctiles ≥44×44px también para las 21 casillas del
checklist; responsive en los tres breakpoints de `docs/design-system.md` (research.md #6).

**Scale/Scope**: Mismo alcance de usuario único que 001; el checklist es un catálogo fijo
de 21 valores (FR-002), sin crecimiento previsto dentro de esta feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para la validación Zod de los 4 campos nuevos y para `crearPacienteDesdeDatos`/`editarPaciente` extendidos; Playwright para los 3 user stories del spec (alta con historia clínica, consulta en ficha, edición), escritos antes de tocar la implementación. |
| II. Arquitectura en capas | Los campos nuevos viven en `src/domain/entities/Paciente.ts` (dominio, sin dependencias de framework); se validan en `src/application/dto/pacienteDto.ts` (límite de aplicación, Principio III); las dos implementaciones del repositorio (`PacienteRepositoryPrisma`, `PacienteRepositoryDexie`) los persisten sin que `application/use-cases` sepa cuál está en uso — mismo patrón que 001, sin capas nuevas. |
| III. Integridad y auditoría de datos | Los 4 campos se validan con Zod en la capa de aplicación, no solo en la UI (FR-002/FR-004). Al ser parte de la misma entidad `Paciente`, heredan el mecanismo de conflicto de sync ya existente (`conflictoPendiente`) — ninguna edición de historia clínica se pierde silenciosamente ante un conflicto entre dispositivos. |
| IV. Control de acceso por rol | Sin cambios: las mismas rutas `/api/patients/*` de 001, ya protegidas por Auth.js, transportan estos campos — no se agrega ninguna ruta nueva que requiera un chequeo de rol distinto. |
| V. Simplicidad y YAGNI | Se descartó una entidad/tabla `HistoriaClinica` separada y una tabla puente para los antecedentes (research.md #1, #2) por no haber caso de uso que las requiera en este spec — se prefirió extender la entidad existente. Se descartó también un booleano `otrosMarcado` redundante (research.md #3). |
| VI. Consistencia de UI, responsive y design system | Se agregan `Checkbox` y `Textarea` a `src/components/ui/`, documentados como extensión de `docs/design-system.md` (no bypass) antes de usarse en el formulario — reutilizan los tokens de borde/foco/error ya existentes, ningún color/tipografía/espaciado nuevo. El checklist usa el mismo patrón de grilla responsive ya establecido en §6.11 (research.md #6). |
| VII. Seguridad y prevención de vulnerabilidades | Prisma sigue parametrizando todo acceso a estas columnas nuevas; Zod sigue validando el enum `AntecedentePatologico` en el límite, evitando valores arbitrarios; sin inputs de tipo HTML sin escapar (los campos de texto libre se renderizan como texto plano, igual que "Dirección" en 001). |
| VIII. Rendimiento y acceso eficiente a datos | Al no introducir una tabla ni relación nueva, no hay riesgo de N+1: los 4 campos se leen/escriben en la misma consulta que ya trae al resto del paciente (research.md #1). |

**Resultado (pre-diseño)**: sin violaciones. No se requiere completar Complexity Tracking.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas.
- `data-model.md` confirma que los campos nuevos son atributos directos de `Paciente`, sin
  relación ni tabla adicional — el Principio VIII se mantiene sin joins nuevos.
- El addendum de contrato (`contracts/patients-api-historia-clinica.md`) no agrega
  endpoints ni rutas — el Principio IV no requiere nuevos chequeos de rol.
- Los dos componentes de UI nuevos (`Checkbox`, `Textarea`) quedan documentados como
  extensión explícita de `docs/design-system.md`, no como excepción al Principio VI.

Sin violaciones. Complexity Tracking permanece sin completar.

## Project Structure

### Documentation (this feature)

```text
specs/003-historia-clinica-paciente/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan)
├── quickstart.md         # Fase 1 (/speckit-plan)
├── contracts/            # Fase 1 (/speckit-plan)
│   └── patients-api-historia-clinica.md
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── entities/
│       └── Paciente.ts                # MODIFICAR: + 4 campos, + enum AntecedentePatologico
│
├── application/
│   ├── dto/
│   │   └── pacienteDto.ts             # MODIFICAR: schemas Zod extendidos
│   └── use-cases/
│       ├── crearPaciente.ts           # Sin cambios (ya delega validación al schema)
│       └── editarPaciente.ts          # Sin cambios (ídem)
│
├── infrastructure/
│   └── db/
│       ├── prisma/
│       │   └── PacienteRepositoryPrisma.ts   # MODIFICAR: mapear los 4 campos nuevos
│       └── dexie/
│           ├── db.ts                          # MODIFICAR: this.version(3), aditivo
│           └── PacienteRepositoryDexie.ts      # MODIFICAR: mapear los 4 campos nuevos
│
├── components/
│   ├── ui/
│   │   ├── Checkbox.tsx               # NUEVO — §6.2 design-system.md, extensión
│   │   ├── Checkbox.module.css        # NUEVO
│   │   ├── Textarea.tsx               # NUEVO — §6.2 design-system.md, extensión
│   │   └── Textarea.module.css        # NUEVO
│   └── pacientes/
│       ├── PacienteFormulario.tsx     # MODIFICAR: + sección "Historia clínica"
│       └── antecedentesPatologicosOpciones.ts  # NUEVO — catálogo de 21 opciones + labels
│
└── app/
    ├── pacientes/
    │   └── [id]/page.tsx              # MODIFICAR: mostrar sección de historia clínica (ficha, modo lectura)
    └── api/
        └── patients/
            ├── route.ts                # Sin cambios de ruta — el body ya viaja completo vía DTO
            └── [id]/route.ts           # Sin cambios de ruta — ídem

prisma/
└── schema.prisma                       # MODIFICAR: + enum AntecedentePatologico, + 4 columnas en Paciente

docs/
└── design-system.md                    # MODIFICAR: documentar Checkbox y Textarea (§6.2), + variante de sección "Historia clínica" (§6.11)

tests/
├── unit/           # + validación Zod de los campos nuevos, + entidad Paciente extendida
├── integration/    # + POST/PUT /api/patients con historia clínica
└── e2e/            # + los 3 escenarios de quickstart.md (alta, consulta, edición)
```

**Structure Decision**: No se agrega ningún proyecto, servicio ni capa nueva — esta feature
extiende exclusivamente los archivos que ya implementan `Paciente` en cada capa de
`001-gestion-pacientes` (dominio → aplicación → infraestructura → presentación), más dos
componentes de UI de propósito general (`Checkbox`, `Textarea`) que quedan disponibles para
otras features futuras, no solo esta.

## Complexity Tracking

*Sin violaciones de la Constitution Check — sección no aplica para esta feature.*
