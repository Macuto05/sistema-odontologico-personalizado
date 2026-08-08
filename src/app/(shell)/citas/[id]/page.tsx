"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/dexie/db";
import { Button } from "@/components/ui/Button";
import { PanelAtencion } from "@/components/citas/PanelAtencion";

/**
 * Ruta del panel de Atención (US1). El `id` de la URL es un id generado en el cliente al
 * presionar "Nueva cita" — no identifica ninguna Cita persistida todavía (esa recién se
 * crea al "Finalizar atención", spec §Assumptions, revisión posterior). Esta página solo
 * carga al Paciente (indicado por `?pacienteId=`) de forma reactiva contra Dexie local.
 */
export default function AtencionPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const pacienteId = searchParams.get("pacienteId");
  const paciente = useLiveQuery(
    () => (pacienteId ? db.pacientes.get(pacienteId) : undefined),
    [pacienteId],
  );

  if (!pacienteId) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <p className="text-body">Falta indicar el paciente para esta atención.</p>
        <Link href="/pacientes">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </main>
    );
  }

  if (paciente === undefined) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <p className="text-body-sm">Cargando…</p>
      </main>
    );
  }

  if (paciente === null) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <p className="text-body">No se encontró el paciente.</p>
        <Link href="/pacientes">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </main>
    );
  }

  return <PanelAtencion citaId={params.id} paciente={paciente} />;
}
