---

description: "Task list for Pantalla de Inicio (Home) del Sistema (002-pantalla-inicio)"
---

# Tasks: Pantalla de Inicio (Home) del Sistema

**Input**: Design documents from `/specs/002-pantalla-inicio/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md,
`.specify/memory/constitution.md`

**Tests**: **Obligatorios**, no opcionales — el Principio I de la constitución (Test-First,
NON-NEGOTIABLE) exige que cada feature tenga tests que fallen, escritos antes del código de
implementación. Cada fase de historia de usuario incluye sus tests primero.

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para poder
implementar y probar cada una de forma independiente.

**Nota sobre alcance ya existente**: `001-gestion-pacientes` (login, `Paciente`,
`buscarPacientes`, sync) ya está implementado y no se retoca salvo lo estrictamente
necesario para montarlo bajo la sidebar compartida (mover `src/app/pacientes/`) y para leer
`?q=` en su búsqueda (US3). No se reimplementa nada de esa feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3, US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Mismo proyecto Next.js único que `001-gestion-pacientes` (ver `plan.md` §Project
Structure): `src/domain/`, `src/application/`, `src/infrastructure/`, `src/app/(shell)/`,
`prisma/`, `tests/`.

---

## Phase 1: Setup

**Purpose**: Crear el andamiaje de carpetas nuevo que este feature necesita, sin tocar aún
lógica existente.

- [ ] T001 Crear las carpetas vacías `src/app/(shell)/`, `src/app/(shell)/configuracion/`,
  `src/app/(shell)/insumos/` y `src/app/api/account/` per `plan.md` §Project Structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida que TODAS las historias de usuario necesitan —
columna `nombre` en `Usuario`, entidad y repositorio de `Usuario`, `nombre` expuesto en la
sesión, middleware extendido a las rutas nuevas, y el route group `(shell)` montando
`pacientes/` ya existente. Corresponde a `research.md` y `data-model.md`.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté
completa.

- [X] T002 Agregar la columna `nombre String` (obligatoria) al modelo `Usuario` en
  `prisma/schema.prisma` per `data-model.md`, y correr `npx prisma migrate dev`
- [X] T003 [P] Actualizar `prisma/seed.ts` para sembrar la cuenta única con un `nombre` no
  vacío (depende de T002)
- [X] T004 [P] Crear la entidad de dominio `Usuario` (id, nombre, email — sin
  `passwordHash` expuesto fuera de infrastructure) en `src/domain/entities/Usuario.ts`
- [X] T005 Crear la interfaz `IUsuarioRepository` (`obtenerPorId`, `actualizarPerfil`,
  `verificarPassword`, `actualizarPassword`) en
  `src/domain/repositories/IUsuarioRepository.ts` (depende de T004)
- [X] T006 [P] Definir los esquemas Zod `actualizarPerfilInput` (nombre, email) y
  `cambiarContrasenaInput` (passwordActual, passwordNueva) en
  `src/application/dto/usuarioDto.ts`
- [X] T007 Implementar `UsuarioRepositoryPrisma` (única implementación — sin par Dexie,
  `research.md` #1) en `src/infrastructure/db/prisma/UsuarioRepositoryPrisma.ts` (depende
  de T002, T005)
- [X] T008 Extender `src/infrastructure/auth/auth.config.ts`: `authorize()` incluye
  `nombre`; agregar callbacks `jwt` y `session` que copian `nombre` hasta
  `session.user.nombre` (depende de T002, T003)
- [X] T009 Extender el `matcher` de `src/middleware.ts` para proteger también `/`,
  `/configuracion/:path*`, `/insumos/:path*` (redirect a `/login`) y `/api/account/:path*`
  (`401 NO_AUTENTICADO`), mismo comportamiento ya implementado para `/pacientes`
  (depende de T008)
- [X] T010 Crear `src/app/(shell)/layout.tsx` mínimo (envuelve `{children}`, sin sidebar
  todavía — la sidebar real es parte de US2) para habilitar el route group (depende de
  T009)
- [X] T011 Mover `src/app/pacientes/` a `src/app/(shell)/pacientes/` (mismo contenido y
  lógica, sin cambios) para que herede el layout compartido (depende de T010)

**Checkpoint**: Con Foundational completo, `Usuario` tiene `nombre` expuesto en la sesión,
el middleware protege todo lo nuevo, y `/pacientes` ya vive bajo el route group
compartido — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Ver el resumen de bienvenida al ingresar (Priority: P1) 🎯 MVP

**Goal**: Mostrar en el inicio un saludo con el nombre del odontólogo y el total de
pacientes activos, con estado 0 explícito si no hay ninguno (FR-001 a FR-003).

**Independent Test**: Iniciar sesión y verificar que aparece el nombre correcto y que el
conteo de pacientes activos coincide con el listado real; con una cuenta sin pacientes,
verificar el estado 0 con invitación a crear el primero (Escenario 1 de `quickstart.md`).

### Tests for User Story 1 (obligatorios per Principio I) ⚠️

> Escribir este test primero y confirmar que falla antes de implementar.

- [X] T012 [P] [US1] Test e2e del Escenario 1 de `quickstart.md` (saludo con nombre real,
  conteo de activos coincide con `/pacientes`, estado 0 con invitación a crear) en
  `tests/e2e/inicio-resumen.spec.ts`

### Implementation for User Story 1

- [X] T013 [US1] Construir `src/app/(shell)/page.tsx`: leer `nombre` de la sesión
  (`useSession()` o `getServerSession(authOptions)`) y mostrar el saludo (FR-001)
- [X] T014 [US1] En la misma página, mostrar el total de pacientes activos reutilizando
  `buscarPacientes(repo, { estado: "ACTIVO" })` vía `useLiveQuery` (mismo patrón que
  `pacientes/page.tsx`) y tomar `.length` — sin nuevo método de repositorio
  (`research.md` #3) (FR-002) (depende de T013)
- [X] T015 [US1] Mostrar, cuando el conteo sea 0, un estado con invitación a crear el
  primer paciente (enlace a `/pacientes/nuevo`) usando `Card`/`Alert` de
  `docs/design-system.md`, sin mostrar error (FR-003) (depende de T014)

**Checkpoint**: US1 funcional de punta a punta — el inicio saluda y resume, de forma
independiente de la sidebar y de Configuración.

---

## Phase 4: User Story 2 - Navegar a las secciones del sistema desde la sidebar (Priority: P2)

**Goal**: Sidebar de navegación funcional (Pacientes, Insumos, Configuración, Cerrar
sesión), visible desde el inicio y protegida sin sesión (FR-004 a FR-008).

**Independent Test**: Desde el inicio, hacer clic en cada opción de la sidebar y verificar
el destino o estado esperado; cerrar sesión desde distintas pantallas; intentar acceder
por URL sin sesión (Escenario 2 de `quickstart.md`).

### Tests for User Story 2 (obligatorios) ⚠️

- [X] T016 [P] [US2] Test e2e del Escenario 2 de `quickstart.md` (navegación a Pacientes,
  placeholder de Insumos, cerrar sesión desde el inicio y desde Pacientes, acceso directo
  por URL a `/`, `/configuracion` e `/insumos` sin sesión) en
  `tests/e2e/navegacion-sidebar.spec.ts`

### Implementation for User Story 2

- [X] T017 [US2] Agregar la sección "6.8 Sidebar / Navegación" al inventario de
  `docs/design-system.md` (estructura, ítem activo/inactivo, comportamiento responsive
  per sección 4.0), usando solo tokens y breakpoints ya existentes — Principio VI exige
  definirla antes de programarla
- [X] T018 [P] [US2] Crear el componente `Sidebar` (`src/components/ui/Sidebar.tsx` +
  `Sidebar.module.css`) per la sección 6.8 recién definida, con los ítems Pacientes,
  Insumos, Configuración y Cerrar sesión, resaltando el ítem activo según la ruta actual
  (depende de T017)
- [X] T019 [US2] Integrar `Sidebar` dentro de `src/app/(shell)/layout.tsx` (reemplaza el
  layout mínimo de Foundational) (depende de T018)
- [X] T020 [US2] Conectar el ítem "Cerrar sesión" a `signOut({ callbackUrl: "/login" })`
  de `next-auth/react` (FR-007) (depende de T019)
- [X] T021 [US2] Crear `src/app/(shell)/insumos/page.tsx` con un mensaje de sección no
  disponible/"próximamente", sin funcionalidad real (FR-006)

**Checkpoint**: US1 y US2 funcionan juntas — el inicio se ve y se navega de punta a
punta, incluido cerrar sesión.

---

## Phase 5: User Story 3 - Buscar un paciente desde el inicio (Priority: P3)

**Goal**: Barra de búsqueda en el inicio que redirige a Pacientes con los mismos
resultados que buscar ahí directamente (FR-009, FR-010).

**Independent Test**: Buscar por nombre parcial y por documento exacto desde el inicio y
verificar que se llega a Pacientes con los resultados correctos; intentar buscar con el
campo vacío y verificar que se exige un criterio (Escenario 3 de `quickstart.md`).

### Tests for User Story 3 (obligatorios) ⚠️

- [X] T022 [P] [US3] Test e2e del Escenario 3 de `quickstart.md` (búsqueda por nombre
  parcial, por documento exacto, y bloqueo con campo vacío) en
  `tests/e2e/busqueda-inicio.spec.ts`

### Implementation for User Story 3

- [X] T023 [US3] Agregar la barra de búsqueda (`Input` + envío) en
  `src/app/(shell)/page.tsx`: al ejecutarse, navega a `/pacientes?q=<texto>`; si el campo
  está vacío, no navega y muestra el mismo aviso de "se requiere un criterio" (FR-009,
  FR-010) (depende de T015)
- [X] T024 [US3] Modificar `src/app/(shell)/pacientes/page.tsx` para inicializar su
  estado `q` desde `useSearchParams().get("q")` en el primer render, sin cambiar la
  lógica de debounce/búsqueda existente (`research.md` #5) (depende de T011, T023)

**Checkpoint**: Buscar desde el inicio produce los mismos resultados que buscar
directamente en Pacientes.

---

## Phase 6: User Story 4 - Editar los datos propios del odontólogo (Priority: P4)

**Goal**: Pantalla de Configuración para editar nombre, email y contraseña, online-only
(FR-011 a FR-015, `research.md` #1).

**Independent Test**: Cambiar nombre/email con valores válidos y verificar que persisten
y que el saludo del inicio los refleja; probar email inválido, contraseña actual
incorrecta, y el fallo visible sin conexión (Escenario 4 de `quickstart.md`).

### Tests for User Story 4 (obligatorios) ⚠️

- [X] T025 [P] [US4] Test unitario de `actualizarPerfil` (nombre vacío rechazado, email
  con formato inválido rechazado, valores válidos persisten) en
  `tests/unit/actualizarPerfil.test.ts`
- [X] T026 [P] [US4] Test unitario de `cambiarContrasena` (rechaza si `passwordActual` no
  coincide vía `bcrypt.compare`, hashea la nueva contraseña si coincide) en
  `tests/unit/cambiarContrasena.test.ts`
- [X] T027 [P] [US4] Test de integración de `GET`/`PATCH /api/account` y
  `POST /api/account/password` per `contracts/account-api.md` (incluye
  `422 DATOS_INVALIDOS` y `401 PASSWORD_ACTUAL_INCORRECTA`, y que ninguna respuesta
  incluya `passwordHash`) en `tests/integration/account.test.ts`
- [X] T028 [P] [US4] Test e2e del Escenario 4 de `quickstart.md` (editar perfil, email
  inválido, cambio de contraseña correcto e incorrecto, fallo visible sin conexión) en
  `tests/e2e/configuracion.spec.ts`

### Implementation for User Story 4

- [X] T029 [US4] Implementar el caso de uso `actualizarPerfil` en
  `src/application/use-cases/actualizarPerfil.ts` (valida con Zod, usa
  `IUsuarioRepository`) (depende de T004, T005, T006, T007)
- [X] T030 [US4] Implementar el caso de uso `cambiarContrasena` en
  `src/application/use-cases/cambiarContrasena.ts` (verifica `passwordActual` con
  bcrypt antes de hashear y guardar la nueva) (depende de T004, T005, T006, T007)
- [X] T031 [US4] Implementar `GET` y `PATCH /api/account` en
  `src/app/api/account/route.ts` per `contracts/account-api.md` (depende de T029)
- [X] T032 [US4] Implementar `POST /api/account/password` en
  `src/app/api/account/password/route.ts` per `contracts/account-api.md` (depende de
  T030)
- [X] T033 [US4] Construir `src/app/(shell)/configuracion/page.tsx`: formulario de
  nombre/email y sección separada para cambiar contraseña, con los componentes
  Input/Button/Alert de `docs/design-system.md`, mostrando visiblemente cualquier fallo
  de red (Configuración es online-only, `research.md` #1) (depende de T031, T032)

**Checkpoint**: Las 4 historias de usuario funcionan de forma independiente y en
conjunto.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final transversal a las 4 historias.

- [X] T034 [P] Correr los 4 escenarios de `quickstart.md` de punta a punta manualmente
  (incluye el paso de conectividad del Escenario 4)
- [X] T035 [P] Verificar el inicio y la sidebar en los tres breakpoints de
  `docs/design-system.md` §4.0 (celular, tablet, escritorio) — Principio VI
- [X] T036 `tsc --noEmit` y `eslint` limpios en todos los archivos nuevos/modificados de
  este feature
- [X] T037 [P] Revisar que ninguna respuesta de `/api/account*` incluya `passwordHash`,
  ni en éxito ni en error (Principio VII)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA todas las historias de usuario
- **Historias de usuario (Phase 3+)**: Todas dependen de Foundational
  - US1 no depende de US2, US3 ni US4
  - US2 no depende de US1, pero comparte el archivo `layout.tsx` que Foundational deja
    mínimo — puede construirse en paralelo a US1
  - US3 depende de que exista la barra de búsqueda del inicio (US1, T015) y de
    `pacientes/page.tsx` ya movido (Foundational, T011)
  - US4 no depende de US1, US2 ni US3 — es la más aislada de las cuatro
- **Polish (Phase 7)**: Depende de que las historias que se quieran entregar estén
  completas

### Dentro de cada historia

- Tests (obligatorios) se escriben y deben fallar antes de implementar
- Entidad/repositorio antes que caso de uso
- Caso de uso antes que ruta de API
- Ruta de API antes que la pantalla que la consume

### Oportunidades de paralelismo

- T003, T004, T006 (Foundational) en paralelo tras T002
- T012, T016, T022, T025-T028 (tests) en paralelo dentro de su propia fase
- US1 y US2 pueden avanzar en paralelo tras Foundational (archivos distintos:
  `page.tsx` vs. `Sidebar.tsx`/`layout.tsx`), aunque ambos tocan `(shell)/layout.tsx` en
  algún punto — coordinar esa integración puntual
- US4 puede avanzar en paralelo a US1/US2/US3 en cualquier momento tras Foundational

---

## Parallel Example: Foundational

```bash
# Tras completar T002 (migración), lanzar juntas:
Task: "Actualizar prisma/seed.ts para incluir nombre (T003)"
Task: "Crear entidad de dominio Usuario en src/domain/entities/Usuario.ts (T004)"
Task: "Definir esquemas Zod en src/application/dto/usuarioDto.ts (T006)"
```

## Parallel Example: User Story 4

```bash
# Los 4 tests de US4 no comparten archivo — lanzar juntos:
Task: "Test unitario de actualizarPerfil (T025)"
Task: "Test unitario de cambiarContrasena (T026)"
Task: "Test de integración de /api/account* (T027)"
Task: "Test e2e del Escenario 4 (T028)"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (crítico — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **Detener y validar**: probar US1 de forma independiente (Escenario 1 de
   `quickstart.md`)
5. El odontólogo ya ve un saludo y un resumen real al entrar, aunque todavía no haya
   sidebar funcional ni Configuración

### Entrega incremental

1. Setup + Foundational → base lista
2. US1 → validar → demo (MVP)
3. US2 → validar → demo (navegación completa)
4. US3 → validar → demo (búsqueda desde el inicio)
5. US4 → validar → demo (Configuración)
6. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Verificar que los tests fallan antes de implementar
- Commit después de cada tarea o grupo lógico
- Detenerse en cada checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de archivo entre historias, dependencias cruzadas que
  rompan la independencia de cada historia
