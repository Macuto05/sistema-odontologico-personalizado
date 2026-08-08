"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { porcentajeDe, EstadoSyncUI } from "@/infrastructure/sync/derivarEstadoSync";
import { EntidadOutbox, TipoOperacionOutbox } from "@/infrastructure/db/dexie/db";
import styles from "./SyncStatusPill.module.css";

/**
 * Indicador de estado de sincronización — 011-indicador-sincronizacion.
 *
 * Se monta en dos lugares (research.md #7): dentro de `TopAppBar` en las pantallas que la
 * tienen, y en posición fija desde `(shell)/layout.tsx` en las que no. Es el mismo componente
 * en ambos casos; `variante="fija"` solo cambia el posicionamiento, no el contenido.
 *
 * Toda la lógica de qué estado mostrar vive en `derivarEstadoSync` (probada aparte) — acá solo
 * queda el marcado. Regla de accesibilidad §4.1 del design system: el estado nunca se comunica
 * solo con color, siempre lleva texto (visible, o vía `aria-label` cuando el ancho lo colapsa
 * a solo ícono).
 */

export interface SyncStatusPillProps {
  /** `"fija"` la posiciona por su cuenta, para pantallas sin TopAppBar. */
  variante?: "enBarra" | "fija";
}

const NOMBRE_ENTIDAD: Record<EntidadOutbox, string> = {
  PACIENTE: "Paciente",
  CONSULTORIO: "Consultorio",
  CITA: "Cita",
  ODONTOGRAMA: "Odontograma",
  CAMBIO_ODONTOGRAMA: "Cambio de odontograma",
  ITEM_PLAN_TRATAMIENTO: "Plan de tratamiento",
  INSUMO: "Insumo",
};

const NOMBRE_OPERACION: Record<TipoOperacionOutbox, string> = {
  CREAR: "crear",
  EDITAR: "editar",
  ARCHIVAR: "archivar",
  REACTIVAR: "reactivar",
  ELIMINAR: "eliminar",
  FINALIZAR: "finalizar",
};

/** "hace 2 min" / "hace 3 h" / "el 5/8/2026" — FR-006. */
function formatearDesde(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `el ${new Date(iso).toLocaleDateString("es")}`;
}

function textoDe(estado: EstadoSyncUI): string {
  switch (estado.tipo) {
    case "OFFLINE":
      return "Sin conexión";
    case "SINCRONIZANDO":
      return estado.progreso
        ? `Sincronizando ${porcentajeDe(estado.progreso)}%`
        : "Sincronizando…";
    case "CONFLICTO":
      return estado.entidades.length === 1
        ? "1 con conflicto"
        : `${estado.entidades.length} con conflicto`;
    case "AL_DIA":
      return "Con conexión";
  }
}

function Panel({ estado }: { estado: EstadoSyncUI }) {
  switch (estado.tipo) {
    case "OFFLINE":
      return (
        <>
          <h4 className={styles.panelTitulo}>Trabajando sin conexión</h4>
          <p className={styles.panelFila}>
            <span>Cambios guardados localmente</span>
            <span>{estado.pendientes}</span>
          </p>
          <p className={styles.panelNota}>Se enviarán solos al reconectar.</p>
        </>
      );

    case "SINCRONIZANDO":
      return (
        <>
          <h4 className={styles.panelTitulo}>
            {estado.progreso ? "Enviando cambios…" : "Trayendo cambios del servidor…"}
          </h4>
          {estado.progreso && (
            <>
              <p className={styles.panelFila}>
                <span>Progreso</span>
                <span>
                  {estado.progreso.enviadas} de {estado.progreso.total}
                </span>
              </p>
              <span
                className={styles.barraFondo}
                role="progressbar"
                aria-valuenow={porcentajeDe(estado.progreso)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de sincronización"
              >
                <span
                  className={styles.barraRelleno}
                  style={{ width: `${porcentajeDe(estado.progreso)}%` }}
                />
              </span>
            </>
          )}
        </>
      );

    case "CONFLICTO":
      return (
        <>
          <h4 className={styles.panelTitulo}>Revisar estos cambios</h4>
          <ul className={styles.listaConflictos}>
            {estado.entidades.map((entidad) => (
              <li key={`${entidad.entidad}|${entidad.entidadId}`} className={styles.itemConflicto}>
                <span>
                  {NOMBRE_ENTIDAD[entidad.entidad]}
                  {/* Con nombre propio (Paciente, Consultorio, Insumo) va entrecomillado; sin
                      él (odontograma, cita…) se identifica por su paciente. Si no hay ninguno
                      de los dos, queda solo el tipo de registro — nunca un uuid, que no le
                      aporta nada al odontólogo. */}
                  {entidad.nombre ? (
                    <> &quot;{entidad.nombre}&quot;</>
                  ) : (
                    entidad.nombrePaciente && <> — {entidad.nombrePaciente}</>
                  )}
                </span>
                <span className={styles.tipoOperacion}>
                  {entidad.tipos.map((tipo) => NOMBRE_OPERACION[tipo]).join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.panelNota}>
            Abrí la pantalla correspondiente para resolverlo.
          </p>
        </>
      );

    case "AL_DIA":
      return (
        <>
          <h4 className={styles.panelTitulo}>Todo sincronizado</h4>
          <p className={styles.panelFila}>
            <span>Última sincronización</span>
            <span>
              {estado.ultimaSincronizacion ? formatearDesde(estado.ultimaSincronizacion) : "—"}
            </span>
          </p>
        </>
      );
  }
}

export function SyncStatusPill({ variante = "enBarra" }: SyncStatusPillProps) {
  const estado = useSyncStatus();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const texto = textoDe(estado);

  // El panel se anuncia como `dialog`: sin mover el foco hacia adentro, su contenido queda
  // fuera del alcance del teclado y del lector de pantalla (§4.1).
  useEffect(() => {
    if (abierto) panelRef.current?.focus();
  }, [abierto]);

  // Cerrar al hacer click fuera o con Escape — sin esto el panel queda abierto al navegar la
  // atención con el mouse, tapando contenido de la pantalla.
  useEffect(() => {
    if (!abierto) return;

    function alClickFuera(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", alClickFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClickFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  return (
    <div
      ref={contenedorRef}
      className={`${styles.contenedor} ${variante === "fija" ? styles.fija : ""}`}
    >
      <button
        ref={botonRef}
        type="button"
        className={`${styles.pill} ${styles[estado.tipo.toLowerCase()]}`}
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        aria-controls={panelId}
        // El texto se oculta visualmente en pantallas angostas (queda solo el punto de
        // color), así que el nombre accesible tiene que traerlo igual — §4.1.
        aria-label={`Estado de sincronización: ${texto}`}
      >
        <span className={styles.punto} aria-hidden="true" />
        <span className={styles.texto}>{texto}</span>
      </button>

      {abierto && (
        <div
          ref={panelRef}
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-label="Detalle de sincronización"
          // Recibe el foco al abrirse sin entrar en el orden de tabulación de la página.
          tabIndex={-1}
        >
          <Panel estado={estado} />
        </div>
      )}
    </div>
  );
}
