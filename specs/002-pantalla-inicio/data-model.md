# Data Model: Pantalla de Inicio (Home) del Sistema

## Usuario (Odontólogo)

Entidad de dominio (`src/domain/entities/Usuario.ts`). A diferencia de `Paciente`, existe
**únicamente** en PostgreSQL (servidor) — no tiene contraparte en IndexedDB/Dexie (ver
`research.md` #1). Ya existía desde la funcionalidad de login (`prisma/schema.prisma`,
modelo `Usuario`); esta feature agrega el campo `nombre` y expone el resto como editable.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Ya existente, sin cambios. |
| `nombre` | string | sí | **Nuevo campo** (no existía antes de esta feature). No vacío. Usado en el saludo del inicio (FR-001) y editable en Configuración (FR-011). |
| `email` | string | sí | Ya existente. Único (constraint ya presente en el schema). Formato de email válido al editar (FR-012). |
| `passwordHash` | string | sí | Ya existente. Nunca se expone en ninguna respuesta ni se replica al cliente (Principio VII, research.md #1). |
| `createdAt` | datetime | sí | Ya existente, sin cambios. |

### Validaciones (derivadas de los Functional Requirements)

- `nombre` no puede estar vacío al crear ni al editar (FR-011).
- `email` debe tener formato válido; un valor inválido se rechaza sin modificar el dato
  guardado (FR-012).
- Cambiar `passwordHash` (vía cambio de contraseña) exige verificar primero la contraseña
  actual con `bcrypt.compare` contra el hash existente; si no coincide, se rechaza el
  cambio sin tocar el hash guardado (FR-013, FR-014).
- Todas las validaciones anteriores ocurren en la capa de aplicación
  (`actualizarPerfil`, `cambiarContrasena`), no solo en la UI (Principio III), y solo
  contra el servidor — no existe una copia local que validar (research.md #1).

### Transiciones

No aplica — `Usuario` no tiene estados ni ciclo de vida propio en esta feature (a
diferencia de `Paciente`, no se archiva ni se reactiva; es la cuenta única del sistema,
ya creada por `prisma/seed.ts` según `001-gestion-pacientes`).

## Paciente (sin cambios)

Ya definido en `specs/001-gestion-pacientes/data-model.md`. Esta feature solo lee sobre
esta entidad — no agrega ni modifica sus campos:

- El **total de pacientes activos** del inicio es `buscarPacientes(repo, { estado:
  "ACTIVO" }).length` (research.md #3), sin nueva entidad ni campo agregado.
- La **búsqueda desde el inicio** redirige a `/pacientes?q=<texto>` y reutiliza
  `OpcionesBusquedaPacientes.q` ya existente (research.md #5).

## Relaciones

- No hay relación de datos entre `Usuario` y `Paciente` en esta feature — el inicio los
  combina solo a nivel de presentación (saludo + conteo en la misma pantalla), no a nivel
  de modelo. `Usuario` no referencia `Paciente` ni viceversa.
- No hay entidades técnicas de soporte nuevas (a diferencia de `OutboxOperation` en
  `001-gestion-pacientes`): al ser `Usuario` online-only, no hay cola de sincronización
  que modelar para esta entidad.
