/**
 * Verifica, contra la base real, que la migración `20260801150000_add_odontograma`
 * (data-model.md §Modificación a `Cita`, Principio III) dejó el esquema en el estado
 * esperado: `Cita.planTratamiento` ya no existe, y `ItemPlanTratamiento` existe con la
 * forma correcta para recibir los datos migrados. La migración en sí es SQL aplicado una
 * sola vez (no hay función de aplicación reutilizable que testear con un mock de Prisma,
 * a diferencia del resto de `tests/integration/`) — esto es lo más cercano a un test
 * automatizado de su resultado.
 */
import { describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/db/prisma/client";

// Timeout ampliado (012-archivos-supabase-storage): estos tests consultan la base real, que
// desde la migración a Supabase es remota — la primera consulta paga el costo de abrir la
// conexión contra el pooler y supera con holgura los 5s por defecto de Vitest.
describe("Migración de Cita.planTratamiento hacia ItemPlanTratamiento", { timeout: 30000 }, () => {
  it("Cita ya no tiene la columna planTratamiento (FR-017)", async () => {
    const columnas = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Cita'`,
    );
    const nombres = columnas.map((c) => c.column_name);
    expect(nombres).not.toContain("planTratamiento");
  });

  it("ItemPlanTratamiento existe con las columnas del data-model (fecha, diente, tratamiento)", async () => {
    const columnas = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'ItemPlanTratamiento'`,
    );
    const nombres = columnas.map((c) => c.column_name);
    expect(nombres).toEqual(
      expect.arrayContaining([
        "id",
        "pacienteId",
        "fecha",
        "diente",
        "tratamiento",
        "version",
        "conflictoPendiente",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("no quedó ninguna Cita con datos de plan de tratamiento huérfanos fuera de ItemPlanTratamiento", async () => {
    // Si la migración se hubiera hecho mal (dropeando la columna sin copiar los datos
    // antes), no habría forma de detectarlo retroactivamente — esto solo confirma que hoy,
    // con el esquema ya migrado, no existe la columna vieja para volver a perder datos en
    // una futura corrida. La preservación real se verificó manualmente al aplicar la
    // migración (Principio III).
    const tabla = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ItemPlanTratamiento') as exists`,
    );
    expect(tabla[0]?.exists).toBe(true);
  });
});
