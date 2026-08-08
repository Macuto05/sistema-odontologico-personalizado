# Implementation Plan: Pantalla de Inicio (Home) del Sistema

**Branch**: `002-pantalla-inicio` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-pantalla-inicio/spec.md`

## Summary

Pantalla de inicio (`/`) que recibe al odontólogo tras el login con un saludo
personalizado y el total de pacientes activos, una barra de búsqueda que redirige a
Pacientes con resultados, y una sidebar de navegación (Pacientes, Insumos, Configuración,
Cerrar sesión) que se convierte en el layout compartido de todo el sistema autenticado.
Se agrega el atributo `nombre` a `Usuario` (no existía) y una pantalla de Configuración
para editarlo junto con email y contraseña. A diferencia de Pacientes, Configuración opera
online-only (confirmado con el usuario): el cambio de contraseña exige verificar el hash
contra el servidor de todas formas, así que se trata la pantalla completa como una única
excepción acotada al patrón local-first, en vez de duplicar la infraestructura de
sync/outbox para una pantalla de uso poco frecuente.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (igual que `001-gestion-pacientes`)

**Primary Dependencies**: Next.js 15 (App Router, ya en uso), Auth.js/NextAuth (sesión JWT
ya configurada — se le agregan `nombre` a los callbacks `jwt`/`session`), Prisma ORM
(migración: agregar columna `nombre` a `Usuario`), Dexie.js (reutilizado solo para leer
pacientes — conteo de activos y búsqueda redirigida — sin tabla ni sync nuevos), Zod
(validación de nombre/email/contraseña nueva), bcryptjs (ya usado en login, se reutiliza
para verificar la contraseña actual y hashear la nueva)

**Storage**: PostgreSQL vía Prisma para `Usuario.nombre` (columna nueva, requiere
migración) y para la verificación/actualización de credenciales (online-only). IndexedDB
vía Dexie ya existente se reutiliza en modo lectura para pacientes (conteo y búsqueda); no
se agrega almacenamiento local ni outbox para `Usuario` — ver `research.md` #1.

**Testing**: Vitest (casos de uso: actualizar perfil, cambiar contraseña, conteo de
activos), Playwright (flujos: ver inicio tras login, navegar la sidebar, buscar desde el
inicio, editar Configuración, cerrar sesión, acceso sin sesión)

**Target Platform**: Web (misma PWA de `001-gestion-pacientes`), responsive en los tres
breakpoints de `docs/design-system.md`

**Project Type**: Aplicación web — mismo proyecto Next.js único, sin frontend/backend
separados

**Performance Goals**: El saludo (desde la sesión JWT, ya en memoria) y el conteo de
pacientes activos (consulta Dexie local) se muestran sin espera perceptible de red; ningún
llamado bloquea el primer render del inicio. Configuración, al ser online-only, debe
mostrar un estado de carga visible mientras espera respuesta del servidor (Principio VIII).

**Constraints**: Responsive en los tres breakpoints y áreas táctiles ≥44×44px, igual que
`001-gestion-pacientes`. A diferencia de Pacientes, Configuración requiere conexión a
internet para guardar cualquier cambio (nombre, email o contraseña) — el sistema debe
comunicar claramente cuando no hay conexión, en vez de fallar en silencio o simular un
guardado que luego se pierde.

**Scale/Scope**: Un solo usuario (el odontólogo); el conteo de pacientes activos opera
sobre la misma escala ya establecida en `001-gestion-pacientes` (cientos a pocos miles de
fichas).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para los nuevos casos de uso (`obtenerResumenInicio`/conteo, `actualizarPerfil`, `cambiarContrasena`) y Playwright para los flujos de usuario del spec, escritos antes de implementar cada historia. |
| II. Arquitectura en capas | Se agrega `src/domain/entities/Usuario.ts` e `IUsuarioRepository` (puerto), análogos a `Paciente`, con una única implementación `infrastructure/db/prisma/UsuarioRepositoryPrisma.ts` (no hay implementación Dexie para `Usuario` — ver más abajo). Los casos de uso en `application/use-cases` no conocen Prisma directamente. |
| III. Integridad y auditoría de datos | Todo cambio de perfil queda asociado a la sesión autenticada. El cambio de contraseña exige la contraseña actual antes de aceptar la nueva (FR-013/FR-014); un email inválido se rechaza antes de guardar (FR-012), sin dejar el registro a medio actualizar. |
| IV. Control de acceso por rol | Middleware existente se extiende para proteger también `/`, `/configuracion` e `/insumos`, y las nuevas rutas `/api/account*`, exigiendo sesión válida igual que ya ocurre con `/pacientes` y `/api/patients`. |
| V. Simplicidad y YAGNI | Configuración se trata como una única pantalla online-only (decisión confirmada con el usuario) en vez de duplicar tabla Dexie + outbox para `Usuario` — infraestructura de sync no se generaliza especulativamente para un caso de uso de baja frecuencia. El conteo de pacientes activos reutiliza `buscarPacientes`/`IPacienteRepository.buscar` existente (`.length`); no se agrega un método `contar()` nuevo al repositorio mientras la escala (cientos a miles) no lo justifique. |
| VI. Consistencia de UI, responsive y design system | La sidebar es un componente nuevo para el inventario de `docs/design-system.md` (sección 6) — se define ahí, con los tokens/breakpoints ya existentes, antes de programarla (no se inventan colores/espaciados nuevos). Responsive verificado en los tres breakpoints antes de dar la pantalla por terminada. |
| VII. Seguridad y prevención de vulnerabilidades | El hash de contraseña (`passwordHash`) nunca se replica a IndexedDB — es la razón de fondo por la que Configuración es online-only. Cambiar la contraseña exige verificar la actual con bcrypt antes de aceptar la nueva. Prisma parametriza toda consulta; Next.js/React escapan salida por defecto. Rutas `/api/account*` verifican sesión igual que `/api/patients`. |
| VIII. Rendimiento y acceso eficiente a datos | El conteo de activos y la búsqueda del inicio leen contra Dexie local, no contra red. Configuración muestra estado de carga visible mientras espera al servidor (única superficie de este feature que sí depende de red). |

**Resultado (pre-diseño)**: una excepción declarada y justificada al patrón local-first
ratificado (Configuración online-only), confirmada con el usuario — ver Complexity
Tracking. Sin otras violaciones.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas.
- `Usuario` gana una única implementación de repositorio (Prisma), no dos como `Paciente`
  — consistente con la decisión online-only, no una asimetría accidental.
- Los contratos de `/api/account` y `/api/account/password` (`contracts/account-api.md`)
  validan y autorizan cada operación contra la sesión activa, consistente con los
  Principios IV y VII.
- La sidebar compartida (`src/app/(shell)/layout.tsx`) es la única fuente del menú de
  navegación — `Pacientes`, `Configuración` e `Insumos` la consumen sin duplicar markup,
  reforzando el Principio VI.

## Project Structure

### Documentation (this feature)

```text
specs/002-pantalla-inicio/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan)
├── quickstart.md         # Fase 1 (/speckit-plan)
├── contracts/            # Fase 1 (/speckit-plan)
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   ├── Paciente.ts                       # Ya existe — sin cambios
│   │   └── Usuario.ts                        # NUEVO — nombre, email, passwordHash
│   └── repositories/
│       ├── IPacienteRepository.ts            # Ya existe — sin cambios
│       └── IUsuarioRepository.ts             # NUEVO (puerto)
│
├── application/
│   ├── use-cases/
│   │   ├── buscarPacientes.ts                # Ya existe — reutilizado para conteo/búsqueda
│   │   ├── actualizarPerfil.ts                # NUEVO — nombre/email (FR-011, FR-012)
│   │   └── cambiarContrasena.ts               # NUEVO — verifica actual, hashea nueva (FR-013, FR-014)
│   └── dto/
│       └── usuarioDto.ts                     # NUEVO
│
├── infrastructure/
│   ├── db/prisma/
│   │   ├── PacienteRepositoryPrisma.ts        # Ya existe — sin cambios
│   │   └── UsuarioRepositoryPrisma.ts         # NUEVO — única implementación (online-only, sin par Dexie)
│   └── auth/
│       └── auth.config.ts                    # MODIFICADO — callbacks jwt/session exponen `nombre`
│
└── app/
    ├── (shell)/                              # NUEVO — route group con la sidebar compartida
    │   ├── layout.tsx                        # Sidebar (Pacientes/Insumos/Configuración/Cerrar sesión) + saludo
    │   ├── page.tsx                          # Inicio: saludo, total activos, barra de búsqueda (US1, US3)
    │   ├── configuracion/page.tsx             # NUEVO — editar nombre/email/contraseña (US4)
    │   ├── insumos/page.tsx                   # NUEVO — placeholder "próximamente" (FR-006)
    │   └── pacientes/                         # MOVIDO bajo el route group para compartir sidebar
    │       ├── page.tsx                       # Ya existe — se le agrega lectura de `?q=` (FR-009)
    │       ├── [id]/page.tsx
    │       ├── archivados/page.tsx
    │       └── nuevo/page.tsx
    └── api/
        ├── patients/...                       # Ya existe — sin cambios
        ├── sync/route.ts                      # Ya existe — sin cambios
        └── account/
            ├── route.ts                       # NUEVO — PATCH: actualizar nombre/email (FR-011, FR-012)
            └── password/route.ts              # NUEVO — POST: cambiar contraseña (FR-013, FR-014)

prisma/
└── schema.prisma                              # MODIFICADO — `Usuario.nombre String` + migración

src/middleware.ts                              # MODIFICADO — matcher agrega "/", "/configuracion",
                                                # "/insumos", "/api/account/:path*"

tests/
├── unit/           # + casos de uso de Usuario (Vitest)
├── integration/    # + rutas /api/account* (Vitest)
└── e2e/            # + flujos de inicio, sidebar, búsqueda redirigida, Configuración (Playwright)
```

**Structure Decision**: Se introduce el route group `src/app/(shell)/` como layout
compartido: es el único lugar que renderiza la sidebar, y de él cuelgan `page.tsx`
(inicio), `configuracion/`, `insumos/` y `pacientes/` (recién movido bajo el grupo para no
duplicar la sidebar en cada pantalla). `Usuario` sigue la misma separación en capas que
`Paciente` (`domain` → `application` → `infrastructure`), pero con una sola
implementación de repositorio (Prisma), no dos — es la consecuencia directa de tratar
Configuración como online-only.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `Usuario` no sigue el patrón local-first (Dexie + outbox) que la constitución ratifica para "el cliente" en general | El cambio de contraseña exige verificar el hash contra el servidor de todas formas — no puede ser offline-first sin replicar `passwordHash` a IndexedDB, lo que viola el Principio VII. Confirmado con el usuario: tratar toda la pantalla de Configuración (nombre, email y contraseña) como una única excepción online-only, en vez de una mezcla inconsistente de campos offline/online. | Guardar nombre/email vía Dexie+outbox y solo la contraseña online: técnicamente más fiel al patrón ratificado, pero duplica infraestructura de sync (nueva tabla Dexie, nuevo outbox) para una pantalla de uso poco frecuente (Principio V, YAGNI) y da una experiencia inconsistente (algunos campos se guardan sin conexión, otro no, en la misma pantalla). |
