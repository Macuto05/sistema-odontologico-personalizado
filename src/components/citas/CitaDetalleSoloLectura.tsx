"use client";

import { Cita } from "@/domain/entities/Cita";
import { CATEGORIA_CONSULTA_LABEL } from "@/components/pacientes/categoriaConsultaOpciones";
import { formatearFechaHora } from "@/components/pacientes/formatearFecha";
import styles from "./CitaDetalleSoloLectura.module.css";

interface CitaDetalleSoloLecturaProps {
  cita: Cita;
}

/**
 * Vista de solo lectura de una cita finalizada (US7, FR-023) — diagnóstico, receta y
 * estudios tal como quedaron al finalizar. Los estudios muestran los archivos que ya se
 * habían adjuntado en su momento, pero ya no se puede subir uno nuevo desde acá: la
 * pestaña Archivos de la ficha (rediseño visual posterior) es el único punto de entrada
 * para subir archivos — mantener dos vías duplicaba el mismo resultado en dos lugares.
 *
 * Rediseño posterior (boceto aprobado): secciones con ícono + tarjetas propias en vez de
 * texto plano, para leerse como un resumen clínico y no como una lista de campos de
 * formulario. La línea de fecha/hora · categoría se movió fuera de acá (`CitaMetaLinea`,
 * más abajo) — quien la usa en un `Drawer` tinteado (`CitasTab`) la pasa como `subtitulo`
 * de la cabecera; `HistorialDrawer` no la necesita porque ya la muestra en el encabezado
 * de cada entrada expandible.
 */
export function CitaDetalleSoloLectura({ cita }: CitaDetalleSoloLecturaProps) {
  return (
    <div className={styles.contenedor}>
      <section className={styles.seccion}>
        <h3 className={styles.tituloSeccion}>
          <span className={styles.iconoSeccion}>
            <IconoDiagnostico />
          </span>
          Diagnóstico
        </h3>
        <div className={styles.campos}>
          <Campo etiqueta="Motivo de consulta" valor={cita.motivoConsulta} />
          <Campo etiqueta="Diagnóstico" valor={cita.diagnostico} />
        </div>
      </section>

      <section className={styles.seccion}>
        <h3 className={styles.tituloSeccion}>
          <span className={styles.iconoSeccion}>
            <IconoReceta />
          </span>
          Receta
        </h3>
        {cita.recetaItems.length === 0 ? (
          <p className={`text-body-sm ${styles.vacio}`}>Sin medicamentos indicados.</p>
        ) : (
          <ul className={styles.recetaLista}>
            {cita.recetaItems.map((item) => (
              <li key={item.id} className={styles.recetaItem}>
                <span className={styles.recetaIcono}>
                  <IconoReceta />
                </span>
                <div>
                  <p className={`text-body-sm ${styles.recetaNombre}`}>{item.medicamento}</p>
                  <p className={`text-caption ${styles.recetaMeta}`}>
                    Dosis: <strong>{item.dosis}</strong> · Frecuencia: <strong>{item.frecuencia}</strong> ·
                    Duración: <strong>{item.duracion}</strong>
                    {item.indicaciones && ` (${item.indicaciones})`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.seccion}>
        <h3 className={styles.tituloSeccion}>
          <span className={styles.iconoSeccion}>
            <IconoEstudios />
          </span>
          Estudios complementarios
        </h3>
        {cita.estudioItems.length === 0 ? (
          <p className={`text-body-sm ${styles.vacio}`}>Sin estudios solicitados.</p>
        ) : (
          <ul className={styles.estudiosLista}>
            {cita.estudioItems.map((item) => (
              <li key={item.id} className={styles.estudio}>
                <IconoInfo />
                <div>
                  <p className="text-body-sm">{item.nombre}</p>
                  {item.archivos.length > 0 && (
                    <ul className={styles.archivosLista}>
                      {item.archivos.map((archivo) => (
                        <li key={archivo.id}>
                          <a
                            href={`/api/citas/${cita.id}/estudios/${item.id}/archivos/${archivo.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-caption"
                          >
                            {archivo.nombreArchivo}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Fecha/hora · categoría de la cita — separado del cuerpo para poder mostrarse como
 * `subtitulo` de un `Drawer` con acento (`CitasTab`) sin duplicar el formateo. */
export function CitaMetaLinea({ cita }: CitaDetalleSoloLecturaProps) {
  return (
    <p className={styles.metaLinea}>
      <IconoCalendario />
      {cita.finalizadaEn ? formatearFechaHora(cita.finalizadaEn) : formatearFechaHora(cita.createdAt)}
      {cita.categoria && (
        <>
          <span className={styles.metaPunto}>·</span>
          <IconoEtiqueta />
          {CATEGORIA_CONSULTA_LABEL[cita.categoria]}
        </>
      )}
    </p>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className={styles.campo}>
      <span className={styles.campoEtiqueta}>{etiqueta}</span>
      <p className="text-body-sm">{valor}</p>
    </div>
  );
}

function IconoDiagnostico() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoReceta() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.5 20.5L3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z" strokeLinejoin="round" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </svg>
  );
}

function IconoEstudios() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinejoin="round" />
      <path d="M14 3v6h6M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function IconoInfo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={styles.iconoInfo}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" strokeLinecap="round" />
    </svg>
  );
}

function IconoCalendario() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function IconoEtiqueta() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12l-8-8H5a2 2 0 0 0-2 2v7l8 8a2 2 0 0 0 3 0l6-6a2 2 0 0 0 0-3z" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1" />
    </svg>
  );
}
