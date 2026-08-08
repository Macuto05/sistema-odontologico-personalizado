"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/dexie/db";
import { Button } from "@/components/ui/Button";
import { VolverLink } from "@/components/ui/VolverLink";
import { OdontogramaTab } from "@/components/odontograma/OdontogramaTab";
import styles from "./odontograma.module.css";

/**
 * Ruta directa al Odontograma de un paciente (006-odontograma) — a diferencia de
 * Diagnóstico/Receta/Estudios, el Odontograma es un dato del paciente, no de una Cita
 * (research.md #6), igual que Antecedentes ya lo es en la propia ficha (003). Por eso tiene
 * su propia ruta fuera del panel de Atención: así sigue siendo consultable (en solo
 * lectura, FR-019) para un paciente archivado, que no tiene el botón "Nueva cita".
 */
export default function OdontogramaPage() {
  const params = useParams<{ id: string }>();
  const paciente = useLiveQuery(() => db.pacientes.get(params.id), [params.id]);

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

  return (
    <main className={styles.pagina}>
      <VolverLink href={`/pacientes/${paciente.id}`} texto="Volver a la ficha" />
      <h1 className="text-heading-lg">Odontograma — {paciente.nombreCompleto}</h1>
      <OdontogramaTab paciente={paciente} />
    </main>
  );
}
