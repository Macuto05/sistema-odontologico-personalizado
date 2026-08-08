# Contrato: API de Sincronización (Outbox)

Usado por el motor de sync del cliente (`infrastructure/sync/syncEngine.ts`) para replicar
en lotes las operaciones acumuladas en el outbox local (Dexie) mientras el dispositivo
estuvo offline. La UI nunca llama a este endpoint directamente.

## `POST /api/sync`

**Body**: lote de operaciones pendientes (tamaño máximo ~20, ver research.md #4).

```json
{
  "operaciones": [
    {
      "id": "uuid-idempotencia-de-la-operacion",
      "pacienteId": "uuid-del-paciente",
      "tipo": "CREAR | EDITAR | ARCHIVAR | REACTIVAR",
      "payload": { "...": "forma de Paciente, según el tipo" },
      "baseVersion": 1
    }
  ]
}
```

**200**: resultado por operación, en el mismo orden que se enviaron. El cliente usa esto
para marcar cada entrada del outbox local como `SINCRONIZADO` o `CONFLICTO`, y limpiar solo
las que terminaron en `SINCRONIZADO`.

```json
{
  "resultados": [
    { "id": "uuid-idempotencia", "estado": "SINCRONIZADO", "paciente": { "...": "..." } },
    { "id": "uuid-idempotencia", "estado": "CONFLICTO", "paciente": { "...": "con conflictoPendiente" } },
    { "id": "uuid-idempotencia", "estado": "RECHAZADO", "error": "DOCUMENTO_DUPLICADO", "pacienteExistente": { "...": "..." } }
  ]
}
```

**Idempotencia**: si el servidor recibe una `id` de operación que ya procesó antes (ej. el
cliente reintentó el lote porque se cortó la conexión a mitad de la respuesta), devuelve el
mismo resultado que la primera vez sin volver a aplicar la mutación.

**Orden**: las operaciones de un mismo `pacienteId` dentro de un lote se aplican en el
orden en que aparecen en el array — el cliente las encola en el outbox en el orden en que
ocurrieron localmente.
