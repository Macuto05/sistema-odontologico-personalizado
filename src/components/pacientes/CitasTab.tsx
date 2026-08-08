"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/dexie/db";
import { Paciente } from "@/domain/entities/Paciente";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { CitaDetalleSoloLectura, CitaMetaLinea } from "@/components/citas/CitaDetalleSoloLectura";
import { RecetaImprimible } from "@/components/citas/RecetaImprimible";
import { CATEGORIA_CONSULTA_LABEL } from "./categoriaConsultaOpciones";
import { formatearFechaHora } from "./formatearFecha";
import styles from "./CitasTab.module.css";

interface CitasTabProps {
  paciente: Paciente;
  onNuevaCita: () => void;
}

/**
 * Tab "Citas" de la ficha de paciente (§6.10.1) — tabla con todo el historial de citas
 * finalizadas, distinta del `HistorialDrawer` embebido en el propio Panel de Atención
 * (§6.15): acá se listan todas (no se excluye ninguna) y el detalle se abre en su propio
 * `Drawer` con acento (rediseño posterior, boceto aprobado) en vez de expandirse en el
 * lugar como en `HistorialDrawer` — antes un `Modal` centrado. No existe columna "Doctor"
 * (a diferencia del boceto de referencia) — el sistema es de un solo usuario.
 *
 * "Imprimir" (dentro del detalle) llama a `window.print()` directo — el talonario en sí
 * (`RecetaImprimible`) se monta siempre que el detalle está abierto, no solo al hacer clic
 * en Imprimir, para que la imagen del membrete ya esté cargada de antemano.
 */
export function CitasTab({ paciente, onNuevaCita }: CitasTabProps) {
  const [citaAbiertaId, setCitaAbiertaId] = useState<string | null>(null);

  const citas = useLiveQuery(
    () =>
      db.citas
        .where("[pacienteId+estado]")
        .equals([paciente.id, "FINALIZADA"])
        .toArray()
        .then((lista) => lista.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    [paciente.id],
  );

  const citaAbierta = citas?.find((c) => c.id === citaAbiertaId) ?? null;

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <h2 className="text-heading-sm">Historial de citas</h2>
        <Button onClick={onNuevaCita}>+ Nueva cita</Button>
      </div>

      {citas === undefined ? (
        <p className="text-body-sm">Cargando…</p>
      ) : citas.length === 0 ? (
        <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
          Este paciente todavía no tiene citas registradas.
        </p>
      ) : (
        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Tratamiento</th>
                <th>Estado</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {citas.map((cita) => (
                <tr key={cita.id}>
                  <td>{formatearFechaHora(cita.finalizadaEn ?? cita.createdAt)}</td>
                  <td>{cita.categoria ? CATEGORIA_CONSULTA_LABEL[cita.categoria] : "Sin categoría"}</td>
                  <td>
                    <span className={styles.estado}>Finalizada</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.verBoton}
                      onClick={() => setCitaAbiertaId(cita.id)}
                      aria-label="Ver detalle de la cita"
                    >
                      <IconoFlecha />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        abierto={citaAbierta !== null}
        titulo="Detalle de la cita"
        subtitulo={citaAbierta && <CitaMetaLinea cita={citaAbierta} />}
        acento
        onCerrar={() => setCitaAbiertaId(null)}
      >
        {citaAbierta && (
          <>
            <div className={styles.accionesDetalle}>
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                <IconoImprimir />
                Imprimir
              </Button>
            </div>
            <CitaDetalleSoloLectura cita={citaAbierta} />
            <RecetaImprimible cita={citaAbierta} paciente={paciente} />
          </>
        )}
      </Drawer>
    </div>
  );
}

function IconoFlecha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoImprimir() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9V2h12v7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
