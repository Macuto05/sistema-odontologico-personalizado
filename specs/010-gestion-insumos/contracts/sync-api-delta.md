# Contrato: cambios sobre la API de Sincronización existente

`POST /api/sync` ya existe (`001-gestion-pacientes/contracts/sync-api.md`) y no se
reemplaza — este documento describe únicamente la extensión necesaria para que también
transporte operaciones de `Insumo` (research.md #2, data-model.md §OutboxOperation). No
duplica lo que no cambia (idempotencia, orden, tamaño de lote: sin cambios).

## Cambios en el body de `POST /api/sync`

Cada operación del array `operaciones` gana un campo `entidad` y renombra `pacienteId` a
`entidadId`:

```json
{
  "operaciones": [
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "entidad": "PACIENTE | INSUMO",
      "entidadId": "uuid-del-paciente-o-insumo",
      "tipo": "CREAR | EDITAR | ARCHIVAR | REACTIVAR",
      "payload": { "...": "forma de Paciente o Insumo, según entidad y tipo" },
      "baseVersion": 1
    }
  ]
}
```

Un mismo lote puede mezclar operaciones de `PACIENTE` e `INSUMO` — el servidor las agrupa
por `entidad` y aplica cada una contra el repositorio Prisma correspondiente
(`PacienteRepositoryPrisma` o `InsumoRepositoryPrisma`).

## Cambios en la respuesta

Mismo formato, el objeto devuelto por resultado pasa a ser `paciente` **o** `insumo` según
la `entidad` de la operación original:

```json
{
  "resultados": [
    { "id": "uuid-idempotencia", "entidad": "INSUMO", "estado": "SINCRONIZADO", "insumo": { "...": "..." } },
    { "id": "uuid-idempotencia", "entidad": "PACIENTE", "estado": "CONFLICTO", "paciente": { "...": "con conflictoPendiente" } }
  ]
}
```

## Sin cambios

- Idempotencia por `id` de operación.
- Orden de aplicación dentro de un mismo `entidadId`.
- Tamaño máximo de lote (~20 operaciones).
- El evento `online` del navegador y el intervalo de reintento del `syncEngine.ts`.

## Migración de datos existentes en Dexie

Los dispositivos que ya sincronizaron `Paciente` antes de esta feature tienen entradas de
`OutboxOperation` con `pacienteId` en vez de `entidad`/`entidadId`. La migración de esquema
de Dexie para esta feature debe recorrer las entradas existentes y reescribirlas con
`entidad: "PACIENTE"` y `entidadId: pacienteId`, para no perder operaciones pendientes de
dispositivos que estuvieron offline durante el despliegue de esta feature.
