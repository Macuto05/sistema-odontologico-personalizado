"use client";

import { useCallback, useEffect, useState } from "react";
import { FileInput } from "@/components/ui/FileInput";
import { formatearFechaHora } from "./formatearFecha";
import { subirArchivoPaciente } from "./subirArchivoPaciente";
import styles from "./ArchivosTab.module.css";

interface ArchivoMeta {
  id: string;
  nombreArchivo: string;
  tipo: "IMAGEN" | "PDF";
  tamanoBytes: number;
  createdAt: string;
}

interface ArchivosTabProps {
  pacienteId: string;
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Tab "Archivos" de la ficha de paciente (rediseño visual posterior a 005/006) — único
 * punto de entrada para subir archivos del paciente (antes se subían colgados de un
 * Estudio dentro de una Cita finalizada; esa vía se retiró de `CitaDetalleSoloLectura`,
 * que ahora solo muestra en modo lectura lo que ya se había subido históricamente).
 * Online-only: no hay espejo en Dexie, se consulta al servidor directo (fetch), a
 * diferencia del resto de la ficha que lee de IndexedDB vía useLiveQuery.
 */
export function ArchivosTab({ pacienteId }: ArchivosTabProps) {
  const [archivos, setArchivos] = useState<ArchivoMeta[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const respuesta = await fetch(`/api/patients/${pacienteId}/archivos`);
      if (!respuesta.ok) throw new Error("fetch-fallido");
      const cuerpo = await respuesta.json();
      setArchivos(cuerpo.archivos);
    } catch {
      setArchivos(null);
      setErrorCarga("No se pudo cargar la lista de archivos. Esta pestaña requiere conexión.");
    } finally {
      setCargando(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function onSeleccionar(archivo: File) {
    setSubiendo(true);
    setErrorSubida(null);
    const resultado = await subirArchivoPaciente(pacienteId, archivo);
    if (!resultado.ok) {
      setErrorSubida(resultado.error ?? "No se pudo subir el archivo.");
    } else {
      await cargar();
    }
    setSubiendo(false);
  }

  async function onEliminar(archivoId: string) {
    setEliminandoId(archivoId);
    try {
      const respuesta = await fetch(`/api/patients/${pacienteId}/archivos/${archivoId}`, {
        method: "DELETE",
      });
      if (respuesta.ok) await cargar();
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <h2 className="text-heading-sm">Archivos del paciente</h2>
      </div>

      {cargando ? (
        <p className="text-body-sm">Cargando…</p>
      ) : errorCarga ? (
        <p role="alert" className={`text-body-sm ${styles.error}`}>
          {errorCarga}
        </p>
      ) : archivos && archivos.length > 0 ? (
        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Tamaño</th>
                <th>Fecha</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {archivos.map((archivo) => (
                <tr key={archivo.id}>
                  <td>{archivo.nombreArchivo}</td>
                  <td>{archivo.tipo === "IMAGEN" ? "Imagen" : "PDF"}</td>
                  <td>{formatearTamano(archivo.tamanoBytes)}</td>
                  <td>{formatearFechaHora(archivo.createdAt)}</td>
                  <td className={styles.acciones}>
                    <a
                      href={`/api/patients/${pacienteId}/archivos/${archivo.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.iconoBoton}
                      aria-label={`Descargar ${archivo.nombreArchivo}`}
                    >
                      <IconoDescargar />
                    </a>
                    <button
                      type="button"
                      className={styles.iconoBoton}
                      onClick={() => onEliminar(archivo.id)}
                      disabled={eliminandoId === archivo.id}
                      aria-label={`Eliminar ${archivo.nombreArchivo}`}
                    >
                      <IconoBorrar />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={`text-body-sm ${styles.sinDatos}`}>Este paciente todavía no tiene archivos.</p>
      )}

      {errorSubida && (
        <p role="alert" className={`text-caption ${styles.error}`}>
          {errorSubida}
        </p>
      )}

      <FileInput
        label="Subir archivo"
        onSeleccionar={onSeleccionar}
        disabled={subiendo}
        helperText={subiendo ? "Subiendo…" : undefined}
      />
    </div>
  );
}

function IconoDescargar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoBorrar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
