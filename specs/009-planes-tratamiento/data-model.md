# Data Model: Planes de tratamiento

## `ItemPlanTratamiento` (extensión de 006-odontograma)

Misma entidad y misma tabla propia (`src/domain/entities/ItemPlanTratamiento.ts`) — no se
crea ninguna tabla nueva. Campos nuevos marcados **NUEVO**; el resto no cambia.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | UUID (string) | sí | Sin cambios. |
| `pacienteId` | UUID (string) | sí | Sin cambios. |
| `fecha` | date | sí | Sin cambios — fecha de creación del plan, cargada desde Odontograma. |
| `diente` | string \| `null` | no | Sin cambios. |
| `tratamiento` | string | sí | Sin cambios. |
| `fechaRealizado` | date \| `null` | **NUEVO** | `null` mientras el plan está pendiente. Se completa con la fecha del día en que se tilda el checkbox "Realizado" (calculada del lado del caso de uso, nunca recibida como dato del cliente — research.md #4) y se vuelve a `null` si se destilda. No existe ningún control de escritura directa sobre este campo. |
| `nota` | string \| `null` | no | **NUEVO** — texto libre opcional, editable desde la pestaña Planes. `null`/cadena vacía se tratan igual (sin nota). |
| `version` | int | sí (default 1) | Sin cambios — mismo mecanismo de conflicto que ya usan `editarItemPlanTratamiento`, `Odontograma`, `Paciente`. Se incrementa también cuando el cambio viene de `marcarRealizadoItemPlanTratamiento`/`editarNotaItemPlanTratamiento` (es el mismo `editar()` del repositorio por debajo). |
| `conflictoPendiente` | JSON \| `null` | no | Sin cambios. |
| `createdAt` / `updatedAt` | datetime | sí | Sin cambios. |

### Validaciones (derivadas de los Functional Requirements)

- `fechaRealizado` solo puede pasar de `null` a un valor, o de un valor a `null` — nunca a
  una fecha elegida por quien llama (FR-007). Enforced por la firma de
  `marcarRealizadoItemPlanTratamiento` (recibe un booleano, no una fecha).
- `nota` no tiene restricción de contenido — cadena vacía se normaliza a `null` (mismo
  criterio que `NotaDental.texto` en 006-odontograma).
- Ninguna llamada originada en la pestaña Planes puede modificar `fecha`, `diente` ni
  `tratamiento`, ni eliminar el registro (FR-010) — no por una validación que los rechace,
  sino porque los dos casos de uso que Planes puede invocar no tienen esos parámetros en su
  firma (research.md #3).

### `DatosEdicionItemPlanTratamiento` (tipo existente, extendido)

```ts
export interface DatosEdicionItemPlanTratamiento {
  fecha?: string;
  diente?: string | null;
  tratamiento?: string;
  fechaRealizado?: string | null; // NUEVO
  nota?: string | null;           // NUEVO
  baseVersion: number;
}
```

`IItemPlanTratamientoRepository.editar()` no cambia de forma — sigue aceptando un objeto
parcial; los dos repos (`Dexie`/`Prisma`) suman una rama condicional más por campo nuevo,
mismo patrón que ya usan para `diente` (`"campo" in datos ? ... : {}`).

## Casos de uso nuevos

### `marcarRealizadoItemPlanTratamiento`

```ts
function marcarRealizadoItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  id: string,
  realizado: boolean,
  baseVersion: number,
): Promise<ResultadoEdicionItemPlanTratamiento>
```

Si `realizado` es `true`, llama a `repo.editar(id, { fechaRealizado: hoy(), baseVersion })`;
si es `false`, `repo.editar(id, { fechaRealizado: null, baseVersion })`. `hoy()` se calcula
adentro del caso de uso (`new Date().toISOString().slice(0, 10)`, mismo formato que el resto
de fechas del dominio), nunca recibido como parámetro (research.md #4).

### `editarNotaItemPlanTratamiento`

```ts
function editarNotaItemPlanTratamiento(
  repo: IItemPlanTratamientoRepository,
  id: string,
  nota: string,
  baseVersion: number,
): Promise<ResultadoEdicionItemPlanTratamiento>
```

Normaliza `nota.trim()` a `null` si queda vacío, y llama a
`repo.editar(id, { nota, baseVersion })`.

Ambos casos de uso son las únicas dos funciones que `PlanesTab.tsx` puede invocar para
mutar datos — no reciben ni reenvían `fecha`/`diente`/`tratamiento` en ningún punto
(FR-010, research.md #3).

## Migración de datos (Prisma)

```prisma
model ItemPlanTratamiento {
  // ...campos existentes sin cambios...
  fechaRealizado DateTime? @db.Date
  nota           String?
}
```

Columnas nuevas nullable — no requieren backfill (todo plan existente nace "pendiente, sin
nota", que es exactamente lo que representa `null` en ambos campos). `prisma migrate dev`
genera la migración; no hace falta un paso manual de datos (a diferencia de la migración de
`Cita.planTratamiento` en 006-odontograma, que sí movía datos existentes).

## Esquema de Dexie (sin cambios de índice)

`itemsPlanTratamiento: "id, pacienteId, fecha"` no cambia — `fechaRealizado`/`nota` viajan
como propiedades del objeto guardado, sin necesidad de índice propio (research.md #6). No se
agrega una `version()` nueva en `db.ts`.

## Zod (`src/application/dto/odontogramaDto.ts`)

`itemPlanTratamientoInputSchema` (creación, sin cambios — `fechaRealizado`/`nota` no se
setean al crear) permanece igual. `editarItemPlanTratamientoInputSchema` (usado por el
endpoint genérico de sync al aplicar una operación `EDITAR` sobre `ITEM_PLAN_TRATAMIENTO`,
sin importar qué caso de uso la originó) se extiende con los 2 campos nuevos, opcionales:

```ts
export const editarItemPlanTratamientoInputSchema = itemPlanTratamientoInputSchema
  .partial()
  .extend({
    fechaRealizado: z.string().nullable().optional(), // NUEVO
    nota: z.string().nullable().optional(),            // NUEVO
    baseVersion: z.number().int().positive(),
  });
```

No hace falta un schema separado para las llamadas angostas — al ser `.partial()`, un payload
que solo trae `{ fechaRealizado, baseVersion }` o `{ nota, baseVersion }` ya valida
correctamente. La frontera real que impide que Planes toque `fecha`/`diente`/`tratamiento` es
de aplicación (los 2 casos de uso, research.md #3), no de este schema — el schema del
endpoint de sync es deliberadamente permisivo porque ya confía en la mutación local ya
validada, mismo criterio que el resto del patrón outbox del proyecto.
