# Implementation Plan: Tema de apariencia (Azul / Morado)

**Branch**: `007-tema-apariencia` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-tema-apariencia/spec.md`

## Summary

Agregar un selector de tema (Azul predeterminado / Morado) a la sección "Apariencia" de
Configuración. El cambio se aplica al instante a toda la aplicación (no solo a la pantalla
de Configuración) escribiendo `data-theme="morado"` en `<html>`, lo que hace que un bloque
de overrides en `globals.css` reasigne solo los tokens semánticos `--color-primary*` y
`--color-ring` a una nueva escala de primitivos `--color-purple-*`. La preferencia se lee y
escribe en `localStorage` con el mismo patrón ya usado para `sidebar-colapsada`, y se aplica
globalmente montando un componente "bootstrap" (siguiendo el precedente de
`SyncEngineBootstrap`) dentro de `Providers`, para que el tema persista al navegar entre
pantallas, no solo mientras se está en Configuración.

## Technical Context

**Language/Version**: TypeScript, Next.js (App Router) — stack ya ratificado, sin cambios.

**Primary Dependencies**: React (`useState`/`useEffect`) y CSS custom properties nativas. No
se agrega ninguna librería nueva (no hace falta `next-themes` ni un Context propio: el
alcance —2 temas, sin sincronización entre dispositivos— no lo justifica, Principio V).

**Storage**: `localStorage` del navegador (clave `"tema"`), igual que `sidebar-colapsada`. No
involucra Prisma/Postgres ni Dexie: la preferencia de tema es de UI pura, no un dato clínico
ni sincronizable (ver Assumptions de spec.md).

**Testing**: Vitest + `@testing-library/react` (`renderHook`) para el hook `useTema`;
Playwright para el flujo end-to-end en `/configuracion` (selección, aplicación instantánea,
persistencia tras recargar).

**Target Platform**: Web responsive (phone/tablet/desktop) vía Next.js App Router — mismo
target que el resto del sistema, sin superficie nueva.

**Project Type**: Aplicación web de un solo código (Next.js App Router), estructura ya
existente del repo — no aplica ninguna de las opciones genéricas de plantilla.

**Performance Goals**: El cambio de tema debe percibirse como instantáneo — es una única
escritura de atributo (`dataset.theme`) que dispara un recálculo de estilos nativo del
navegador, sin JavaScript adicional por componente ni re-render de árbol.

**Constraints**: No debe introducir un mismatch de hidratación SSR/cliente distinto al ya
aceptado para `sidebar-colapsada` (mismo criterio: leer `localStorage` en un `useEffect`
post-mount). Debe cumplir el Principio VI: todo color nuevo se define primero en
`docs/design-system.md`, nunca ad-hoc en un componente.

**Scale/Scope**: 2 temas, 5 tokens semánticos reasignados (`--color-primary`,
`--color-primary-hover`, `--color-primary-active`, `--color-primary-accent`, `--color-ring`),
5 primitivos nuevos (`--color-purple-50/600/700/800/900`), 1 hook, 1 componente bootstrap, 1
sección nueva en una página existente.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Evaluación |
|---|---|---|
| I. Test-First | Sí | El hook `useTema` y el flujo e2e se escriben con test que falla primero, antes de la implementación. |
| II. Layered Architecture | Parcial | No hay regla de negocio ni dominio clínico involucrado — es preferencia de UI pura. El hook vive en una capa de presentación (`src/hooks`), sin importar del dominio ni ser importado por él. No hay violación posible del sentido de dependencias porque no hay capa de dominio implicada. |
| III. Data Integrity & Auditability | N/A | No escribe datos clínicos, de citas ni de facturación; no hay "quién cambió qué" que auditar en una preferencia de navegador no atribuible a un paciente. |
| IV. Role-Based Access Control | N/A | No es una acción clínica ni administrativa; cualquier usuario autenticado ve y cambia su propio tema de UI, sin datos de terceros involucrados. |
| V. Simplicity & YAGNI | Sí | Se descarta explícitamente un Context de tema, `next-themes`, o soporte a más de 2 temas: no hay un tercer caso de uso concreto todavía. `useState` + `localStorage` alcanza. |
| VI. UI Consistency & Design System | Sí (NON-NEGOTIABLE) | `docs/design-system.md` se actualiza primero (Fase 1) con la escala `--color-purple-*` y la regla de overrides por tema, antes de tocar `globals.css`. Los tonos elegidos se validan por contraste (ver research.md). No se crea ningún componente nuevo de botón/input: los swatches son el único elemento visual nuevo y se documentan en design-system.md como parte de esta feature. |
| VII. Security & Vulnerability Prevention | N/A | No hay acceso a datos, autenticación ni almacenamiento de secretos involucrado. |
| VIII. Performance & Efficient Data Access | Sí | No hay llamadas de red ni consultas involucradas; el cambio es una escritura de atributo DOM síncrona. No aplica riesgo de N+1 ni de llamadas redundantes. |

**Resultado**: PASS. No hay violaciones que requieran la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-tema-apariencia/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera carpeta `contracts/`: la feature no expone ninguna API ni interfaz externa (no
hay endpoint nuevo ni contrato de red); su única superficie pública es el hook `useTema` y la
sección de UI, ambos documentados en `data-model.md` y `quickstart.md`.

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                    # Root layout — sin cambios de estructura
│   ├── globals.css                   # + bloque [data-theme="morado"] y primitivos --color-purple-*
│   ├── providers.tsx                 # + <TemaBootstrap /> junto a <SyncEngineBootstrap />
│   └── (shell)/
│       └── configuracion/
│           └── page.tsx              # + nueva <Card> "Apariencia" con los dos swatches
├── hooks/
│   └── useTema.ts                    # NUEVO — lee/escribe localStorage["tema"], aplica data-theme
└── components/ui/                    # Reutiliza Card/CardHeader/CardContent existentes; sin
                                       # componentes nuevos (los swatches no ameritan un primitivo
                                       # reutilizable con un solo caso de uso, Principio V)

docs/
└── design-system.md                  # + primitivos --color-purple-* (§2.1) y regla de
                                       # theming por atributo (nueva subsección bajo §3.2)

tests/
├── unit/
│   └── useTema.test.ts               # NUEVO — Vitest + @testing-library/react (renderHook)
└── e2e/
    └── tema-apariencia.spec.ts       # NUEVO — Playwright: seleccionar, aplicar, persistir
```

**Structure Decision**: Se reutiliza la estructura ya existente del repo (Next.js App Router
con `src/app`, `src/components/ui`, capas `application`/`domain`/`infrastructure` para lo
clínico). Esta feature no toca ninguna capa de dominio: solo agrega `src/hooks/` (carpeta
nueva, primer hook compartido del proyecto) y modifica tres archivos existentes más
`docs/design-system.md`. No aplica ninguna de las estructuras alternativas de la plantilla
(no hay split frontend/backend ni app móvil).

## Complexity Tracking

*Sin violaciones — tabla no aplica.*
