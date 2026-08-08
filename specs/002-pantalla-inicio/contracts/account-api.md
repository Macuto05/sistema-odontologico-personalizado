# Contrato: API de Cuenta (Configuración del odontólogo)

Todas las rutas requieren sesión válida (Auth.js) — sin sesión, `401`. Todas devuelven y
reciben JSON. Los tipos siguen `data-model.md` (`Usuario`). A diferencia de
`patients-api.md`, estas rutas son **online-only por diseño** (research.md #1): no existe
una ruta de sincronización ni un `baseVersion`/detección de conflicto — solo hay un
`Usuario` y una sesión, no dispositivos concurrentes editando el mismo perfil.

## `GET /api/account`

Devuelve los datos editables del odontólogo autenticado (no requiere `id` en la URL — la
sesión ya identifica al único usuario).

**200**:
```json
{ "usuario": { "id": "...", "nombre": "...", "email": "..." } }
```

`passwordHash` nunca se incluye en la respuesta (Principio VII).

## `PATCH /api/account`

Actualiza `nombre` y/o `email` del odontólogo autenticado (FR-011).

**Body**:
```json
{ "nombre": "string", "email": "string" }
```

**200**: `{ "usuario": { "id": "...", "nombre": "...", "email": "..." } }`

**422**: `nombre` vacío o `email` con formato inválido — FR-012, validado con Zod. No
modifica el registro guardado.
```json
{ "error": "DATOS_INVALIDOS", "campos": ["email"] }
```

## `POST /api/account/password`

Cambia la contraseña del odontólogo autenticado (FR-013).

**Body**:
```json
{ "passwordActual": "string", "passwordNueva": "string" }
```

**200**: `{ "ok": true }` — la nueva contraseña rige desde el próximo inicio de sesión.

**401** (contraseña actual incorrecta): no modifica `passwordHash` — FR-014.
```json
{ "error": "PASSWORD_ACTUAL_INCORRECTA" }
```

**422**: `passwordNueva` no cumple el largo mínimo (validado con Zod, mismo estándar ya
usado para la contraseña de login en `001-gestion-pacientes`).
