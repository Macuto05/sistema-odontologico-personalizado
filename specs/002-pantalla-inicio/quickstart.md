# Quickstart: Pantalla de Inicio (Home) del Sistema

Guía de validación manual/e2e de que la feature funciona de punta a punta, incluida la
excepción online-only de Configuración (research.md #1). No repite los contratos
(`contracts/`) ni el modelo de datos (`data-model.md`) — los referencia.

## Prerrequisitos

- Los mismos de `001-gestion-pacientes` (Node.js 20+, PostgreSQL, `.env`, dependencias
  instaladas, cuenta de odontólogo sembrada).
- Migración de Prisma aplicada con la nueva columna `Usuario.nombre` (ver
  `data-model.md`), y la cuenta sembrada con un `nombre` no vacío.
- Al menos un par de pacientes activos ya cargados (de `001-gestion-pacientes`) para
  validar el conteo y la búsqueda.

## Puesta en marcha

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Iniciar sesión con la cuenta única del odontólogo.

## Escenario 1 — Resumen de bienvenida (US1, FR-001 a FR-003)

1. Iniciar sesión → el inicio debe mostrar un saludo con el `nombre` real de la cuenta
   sembrada.
2. El total de pacientes activos mostrado debe coincidir con la cantidad real visible en
   `/pacientes` (sin contar archivados).
3. (Con una cuenta de prueba sin pacientes) El inicio debe mostrar `0` junto con una
   invitación a crear el primer paciente, no un espacio vacío ni un error.

**Resultado esperado**: SC-001.

## Escenario 2 — Navegación por la sidebar (US2, FR-004 a FR-008)

1. Desde el inicio, seleccionar "Pacientes" → debe llevar a `/pacientes` (la pantalla ya
   existente de `001-gestion-pacientes`, ahora bajo el layout compartido).
2. Seleccionar "Insumos" → debe mostrar una sección marcada como no disponible/próximamente,
   sin errores ni pantalla en blanco.
3. Seleccionar "Cerrar sesión" desde el inicio, y por separado desde `/pacientes` →
   en ambos casos debe terminar la sesión y redirigir a `/login`.
4. Cerrar sesión y luego intentar acceder directamente a `/`, `/configuracion` o
   `/insumos` por URL → debe redirigir a `/login` en los tres casos (FR-008).

**Resultado esperado**: SC-002, SC-005.

## Escenario 3 — Búsqueda desde el inicio (US3, FR-009, FR-010)

1. Desde el inicio, buscar por parte de un nombre existente (en minúsculas aunque el
   nombre real tenga mayúsculas) y ejecutar la búsqueda → debe llevar a `/pacientes`
   mostrando los mismos resultados que buscar directamente ahí (`contracts/` de
   `001-gestion-pacientes`).
2. Repetir buscando por un documento exacto → debe llevar a `/pacientes` mostrando
   únicamente ese paciente.
3. Intentar ejecutar la búsqueda con el campo vacío → no debe navegar ni ejecutar
   ninguna búsqueda; debe indicar que se requiere al menos un criterio.

**Resultado esperado**: SC-003.

## Escenario 4 — Configuración: editar perfil y contraseña (US4, FR-011 a FR-014)

1. En Configuración, cambiar nombre y/o email a valores válidos y guardar → deben
   persistir, y el saludo del inicio debe reflejar el nuevo nombre en la siguiente
   visita (`GET /api/account`, `PATCH /api/account` — `contracts/account-api.md`).
2. Intentar guardar un email con formato inválido → debe rechazarse (`422
   DATOS_INVALIDOS`) sin modificar el email guardado.
3. Cambiar la contraseña ingresando correctamente la contraseña actual → debe aceptarse;
   cerrar sesión e iniciar sesión de nuevo con la contraseña **nueva** debe funcionar.
4. Intentar cambiar la contraseña con la contraseña actual **incorrecta** → debe
   rechazarse (`401 PASSWORD_ACTUAL_INCORRECTA`) sin modificar la contraseña vigente
   (verificar iniciando sesión de nuevo con la contraseña **anterior**, que debe seguir
   funcionando).
5. (Validación de la decisión online-only, research.md #1) Desconectar la red y repetir
   el paso 1 → el guardado debe fallar de forma visible e informativa (no silenciosa, no
   simular éxito), a diferencia de una edición de paciente en `/pacientes` que sí
   funciona sin conexión.

**Resultado esperado**: SC-004; confirma que Configuración es la única superficie de esta
feature que depende de conexión, de forma explícita para el usuario.

## Tests automatizados equivalentes

- `tests/unit/`: casos de uso `actualizarPerfil`, `cambiarContrasena`, y el cálculo del
  total de pacientes activos.
- `tests/integration/`: rutas de `contracts/account-api.md` contra una base de datos de
  prueba (incluye el caso `passwordActual` incorrecta y el email inválido).
- `tests/e2e/`: los 4 escenarios anteriores con Playwright, incluyendo el acceso directo
  por URL sin sesión (Escenario 2.4) y la emulación de offline para Configuración
  (Escenario 4.5).
