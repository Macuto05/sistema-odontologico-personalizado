"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/dexie/db";
import { CATEGORIA_CONSULTA_LABEL } from "@/components/pacientes/categoriaConsultaOpciones";
import { formatearFechaHora } from "@/components/pacientes/formatearFecha";
import { CitaDetalleSoloLectura } from "./CitaDetalleSoloLectura";
import styles from "./HistorialDrawer.module.css";

interface HistorialDrawerProps {
  pacienteId: string;
  citaActualId: string;
}

/**
 * Contenido del Drawer "Historial de citas" (revisión visual posterior a
 * 005-atencion-paciente) — línea de tiempo con la atención en curso arriba ("HOY — en
 * progreso", solo un indicador visual: la Cita todavía no existe hasta finalizar) y cada
 * cita anterior como una entrada expandible en el lugar (antes cada una abría su propio
 * Modal anidado dentro del panel lateral). El detalle expandido reutiliza
 * `CitaDetalleSoloLectura` tal cual — mismo componente, ahora inline en vez de en un Modal.
 */
export function HistorialDrawer({ pacienteId, citaActualId }: HistorialDrawerProps) {
  const [citaExpandidaId, setCitaExpandidaId] = useState<string | null>(null);

  const citas = useLiveQuery(
    () =>
      db.citas
        .where("[pacienteId+estado]")
        .equals([pacienteId, "FINALIZADA"])
        .toArray()
        .then((lista) =>
          lista.filter((c) => c.id !== citaActualId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
    [pacienteId, citaActualId],
  );

  return (
    <div className={styles.linea}>
      <div className={styles.hoy}>
        <span className={styles.puntoHoy} aria-hidden="true" />
        <div>
          <p className="text-body-sm" style={{ fontWeight: 600 }}>
            Hoy
          </p>
          <p className="text-caption" style={{ color: "var(--color-muted-foreground)" }}>
            En progreso…
          </p>
        </div>
      </div>

      {citas === undefined ? (
        <p className="text-body-sm">Cargando…</p>
      ) : citas.length === 0 ? (
        <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
          Este paciente no tiene citas anteriores.
        </p>
      ) : (
        <ul className={styles.lista}>
          {citas.map((cita) => {
            const expandida = citaExpandidaId === cita.id;
            return (
              <li key={cita.id} className={styles.entrada}>
                <span className={styles.punto} aria-hidden="true" />
                <div className={styles.entradaCuerpo}>
                  <button
                    type="button"
                    className={styles.encabezadoEntrada}
                    aria-expanded={expandida}
                    onClick={() => setCitaExpandidaId(expandida ? null : cita.id)}
                  >
                    <div>
                      <p className="text-body-sm" style={{ fontWeight: 600 }}>
                        {formatearFechaHora(cita.createdAt)}
                      </p>
                      <p className="text-caption" style={{ color: "var(--color-muted-foreground)" }}>
                        {cita.categoria ? CATEGORIA_CONSULTA_LABEL[cita.categoria] : "Sin categoría"}
                        {cita.diagnostico ? ` — ${cita.diagnostico}` : ""}
                      </p>
                    </div>
                    <IconoFlecha abierta={expandida} />
                  </button>
                  {expandida && (
                    <div className={styles.detalle}>
                      <CitaDetalleSoloLectura cita={cita} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link href={`/pacientes/${pacienteId}`} className={`text-body-sm ${styles.verExpediente}`}>
        Ver expediente completo →
      </Link>
    </div>
  );
}

function IconoFlecha({ abierta }: { abierta: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: abierta ? "rotate(180deg)" : undefined, flexShrink: 0 }}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
