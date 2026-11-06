"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/dexie/db";
import {
  CambioOdontograma,
  reconstruirHallazgosAlMomento,
  reconstruirNotasAlMomento,
} from "@/domain/entities/CambioOdontograma";
import { HallazgoDental, NotaDental } from "@/domain/entities/Odontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { formatearSoloFecha } from "@/components/pacientes/formatearFecha";
import { DiagramaBoca, FilaDiagrama, SeleccionDiente } from "./DiagramaBoca";
import { LeyendaOdontograma } from "./LeyendaOdontograma";
import { SimboloHallazgo } from "./simboloUtils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import panelStyles from "./PanelHerramientas.module.css";
import styles from "./HistorialOdontogramaTab.module.css";

interface HistorialOdontogramaTabProps {
  /** Odontogramas del paciente (adulto y/o niño) — el diagrama es unificado, así que cada
   * uno se reconstruye por separado (cada dentición tiene sus propios checkpoints) y se
   * muestran juntos. */
  odontogramaIds: string[];
  filas: FilaDiagrama[];
}

// Mismo mapa que PanelHerramientas.tsx (no exportado desde ahí) — duplicado local, igual
// criterio ya usado entre ese archivo y CambioOdontograma.ts.
const NOMBRE_SUPERFICIE: Record<string, string> = {
  MESIAL: "mesial",
  DISTAL: "distal",
  VESTIBULAR: "vestibular",
  PALATINO_LINGUAL: "palatino/lingual",
  OCLUSAL_INCISAL: "oclusal/incisal",
};

function formatearVariante(variante: string): string {
  return variante.charAt(0) + variante.slice(1).toLowerCase();
}

/**
 * Pestaña "Historial" del Odontograma — ya NO es un historial navegable (revisión posterior,
 * feedback directo y reiterado de la odontóloga: "no hace falta que estén ni se guarden los
 * demás cambios, solo debe aparecer el último cambio reciente"). Muestra una única foto:
 * cómo se veía el odontograma justo antes del último "Guardar cambios" — sin lista, sin
 * selector, sin mostrar cuántos checkpoints anteriores existen. Sigue reconstruyendo ese
 * momento a partir del mismo log de auditoría append-only (`CambioOdontograma`) que ya se
 * sincroniza — no hace ninguna consulta nueva al servidor — pero solo expone el más reciente.
 *
 * Igual que en "Actual", un clic en un diente/superficie muestra su nota y sus hallazgos en
 * el mismo cuadro azul-grisáceo (reutiliza los estilos de `PanelHerramientas`) — la diferencia
 * es que acá es de solo lectura: sin catálogo de condiciones para agregar, sin botones
 * Eliminar/Marcar realizado, y la nota se muestra en un textarea `readOnly` (feedback
 * directo: antes no había forma de ver qué símbolo/nota tenía un diente en este momento
 * pasado, había que adivinar por el ícono en el diagrama).
 *
 * El recuadro y el diagrama se renderizan siempre (cargando, sin historial, o con datos) —
 * nunca un `<p>` suelto de otra altura reemplazando todo el bloque — para que la posición no
 * salte al cambiar de "Actual" a "Historial" (feedback directo: ese salto de altura se sentía
 * como un parpadeo que corría el diagrama).
 */
export function HistorialOdontogramaTab({ odontogramaIds, filas }: HistorialOdontogramaTabProps) {
  const [seleccion, setSeleccion] = useState<SeleccionDiente | null>(null);
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);
  const claveIds = odontogramaIds.join(",");

  const cambios = useLiveQuery(async () => {
    if (odontogramaIds.length === 0) return [];
    const todos = await db.cambiosOdontograma.where("odontogramaId").anyOf(odontogramaIds).toArray();
    return todos.sort((a, b) => b.registradoEn.localeCompare(a.registradoEn));
  }, [claveIds]);

  // Cambiar de paciente (otros odontogramas) invalida la selección en curso.
  useEffect(() => {
    setSeleccion(null);
  }, [claveIds]);

  // Cada dentición se reconstruye con SUS checkpoints (justo antes del último guardado de
  // esa dentición: el `registradoEn` del checkpoint anterior, o "" — vacío — si el último es
  // el único) y el resultado se une para el diagrama unificado.
  const reconstruido = useMemo(() => {
    const hallazgos: HallazgoDental[] = [];
    const notas: NotaDental[] = [];
    let ultimoCheckpoint: CambioOdontograma | null = null;
    for (const id of odontogramaIds) {
      const propios = (cambios ?? []).filter((c) => c.odontogramaId === id);
      const checkpoints = propios.filter((c) => c.tipoCambio === "CHECKPOINT");
      if (!checkpoints[0]) continue;
      const momento = checkpoints[1]?.registradoEn ?? "";
      hallazgos.push(...reconstruirHallazgosAlMomento(propios, momento));
      notas.push(...reconstruirNotasAlMomento(propios, momento));
      if (!ultimoCheckpoint || checkpoints[0].registradoEn > ultimoCheckpoint.registradoEn) {
        ultimoCheckpoint = checkpoints[0];
      }
    }
    return { hallazgos, notas, ultimoCheckpoint };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cambios, claveIds]);
  const { ultimoCheckpoint } = reconstruido;
  const hallazgosReconstruidos = reconstruido.hallazgos;
  const notasReconstruidas = reconstruido.notas;

  const hallazgosSeleccion = useMemo(() => {
    if (!seleccion) return [];
    return hallazgosReconstruidos.filter(
      (h) => h.dientes.includes(seleccion.diente) && h.superficie === seleccion.superficie,
    );
  }, [hallazgosReconstruidos, seleccion]);

  const notaSeleccion = seleccion
    ? (notasReconstruidas.find(
        (n) => n.diente === seleccion.diente && n.superficie === seleccion.superficie,
      )?.texto ?? "")
    : "";

  // Texto de la primera fila del recuadro — nunca deja de renderizarse el recuadro ni el
  // diagrama debajo (a diferencia de la primera versión, que devolvía un `<p>` suelto y
  // mucho más bajo mientras `cambios` cargaba o si no había historial): eso colapsaba y
  // volvía a expandir la altura del tab al cambiar de "Actual" a "Historial", un parpadeo
  // perceptible que corría todo lo de abajo (feedback directo). Reservando siempre el mismo
  // layout, la posición queda fija igual que en "Actual" — solo cambia este texto.
  const textoEncabezado = ultimoCheckpoint
    ? `Así se veía antes del último guardado — ${formatearSoloFecha(ultimoCheckpoint.registradoEn)}`
    : cambios === undefined
      ? "Cargando…"
      : "Todavía no hay cambios registrados en este odontograma.";

  return (
    <div className={styles.contenedor}>
      <div className={panelStyles.panel}>
        <div className={panelStyles.fila1}>
          <span className={`text-body-sm ${styles.leyendaMomento}`}>{textoEncabezado}</span>
          <div className={panelStyles.acciones}>
            <Button type="button" variant="outline" size="sm" onClick={() => setLeyendaAbierta(true)}>
              Ver leyenda
            </Button>
          </div>
        </div>

        {!seleccion && (
          <p className={`text-body-sm ${panelStyles.ayuda}`}>
            Haz clic en un diente o una superficie del diagrama para ver su nota y su condición.
          </p>
        )}

        {seleccion && (
          <>
            <span className="text-body-sm" style={{ fontWeight: 600 }}>
              {`Diente ${seleccion.diente}${
                seleccion.superficie ? ` — ${NOMBRE_SUPERFICIE[seleccion.superficie]}` : ""
              }`}
            </span>

            <div className={hallazgosSeleccion.length > 0 ? panelStyles.fila2 : undefined}>
              <Textarea label="Nota" value={notaSeleccion} readOnly rows={2} />

              {hallazgosSeleccion.length > 0 && (
                <div className={panelStyles.bloqueHallazgos}>
                  <p className={`text-body-sm ${panelStyles.subtitulo}`}>Hallazgos en esta selección</p>
                  <ul className={panelStyles.hallazgosLista}>
                    {hallazgosSeleccion.map((h) => {
                      const condicion = buscarCondicion(h.condicionId);
                      return (
                        <li key={h.id} className={panelStyles.hallazgoItem}>
                          <div className={panelStyles.hallazgoInfo}>
                            <SimboloHallazgo hallazgo={h} />
                            <span className="text-body-sm">
                              {condicion?.nombre ?? h.condicionId}
                              {h.variante && ` — ${formatearVariante(h.variante)}`}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <DiagramaBoca
        filas={filas}
        hallazgos={hallazgosReconstruidos}
        seleccion={seleccion}
        onClickDiente={(diente) => setSeleccion({ diente, superficie: null })}
        onClickSuperficie={(diente, superficie) => setSeleccion({ diente, superficie })}
      />

      <LeyendaOdontograma abierto={leyendaAbierta} onCerrar={() => setLeyendaAbierta(false)} />
    </div>
  );
}
