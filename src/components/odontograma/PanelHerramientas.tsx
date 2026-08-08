"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  CATALOGO_ODONTOGRAMA,
  CATEGORIAS_CONDICION,
  CategoriaCondicion,
  CondicionOdontograma,
  buscarCondicion,
} from "@/domain/entities/CondicionOdontograma";
import { Denticion, HallazgoDental } from "@/domain/entities/Odontograma";
import { SeleccionDiente } from "./DiagramaBoca";
import { SimboloCondicionPreview, SimboloHallazgo } from "./simboloUtils";
import styles from "./PanelHerramientas.module.css";

interface PanelHerramientasProps {
  denticion: Denticion;
  seleccion: SeleccionDiente | null;
  hallazgosSeleccion: HallazgoDental[];
  nota: string;
  pendienteMultiDiente: boolean;
  errorMultiDiente: string | null;
  /** true si hay algo en el borrador (odontograma y/o plan de tratamiento) distinto de lo
   * último guardado — habilita "Guardar cambios"/"Cancelar", que ya no dependen de tener
   * un diente seleccionado (son acciones globales de toda la sesión de edición). */
  hayCambiosPendientes: boolean;
  guardando: boolean;
  onAplicarCondicion: (condicionId: string, variante: string | null) => void;
  onIniciarMultiDiente: (condicionId: string) => void;
  onCancelarMultiDiente: () => void;
  onCambiarEstado: (hallazgo: HallazgoDental) => void;
  onEliminarHallazgo: (hallazgo: HallazgoDental) => void;
  onGuardarNota: (texto: string) => void;
  onGuardarCambios: () => void;
  onCancelar: () => void;
  onAbrirLeyenda: () => void;
}

/** "TEMPORAL" → "Temporal" — variante legible junto al nombre de la condición en la lista
 * de hallazgos (ej. "Corona — Temporal"); antes la variante quedaba guardada pero invisible
 * en toda la interfaz, no solo en el símbolo del diagrama. */
function formatearVariante(variante: string): string {
  return variante.charAt(0) + variante.slice(1).toLowerCase();
}

const NOMBRE_SUPERFICIE: Record<string, string> = {
  MESIAL: "mesial",
  DISTAL: "distal",
  VESTIBULAR: "vestibular",
  PALATINO_LINGUAL: "palatino/lingual",
  OCLUSAL_INCISAL: "oclusal/incisal",
};

/**
 * Panel de herramientas — es el control interactivo, no una leyenda (revisión posterior al
 * diseño original). Flujo: un clic en un diente/superficie del diagrama lo selecciona; acá
 * se elige qué condición aplicarle. Con hallazgos ya existentes en la selección, también
 * ofrece cambiar su estado o eliminarlos (US3). Sin selección, solo muestra un mensaje —
 * el catálogo de referencia completo vive en la Leyenda (FR-011), no duplicado acá.
 *
 * Layout en filas horizontales, arriba del diagrama (no al costado) — antes el panel de
 * 260px fijo le restaba ancho al diagrama y causaba scroll horizontal incluso en pantallas
 * grandes; con el ancho completo disponible, las 32 piezas de una arcada entran sin scroll
 * (decisión validada con boceto, ver conversación). Fila 1: diente/superficie + acciones.
 * Fila 2: nota y hallazgos existentes en 2 columnas. Fila 3: categorías como pestañas
 * horizontales (una activa a la vez, mismo criterio que el Accordion "modo única" que
 * reemplaza) con la fila de condiciones de la categoría activa debajo.
 */
export function PanelHerramientas({
  denticion,
  seleccion,
  hallazgosSeleccion,
  nota,
  pendienteMultiDiente,
  errorMultiDiente,
  hayCambiosPendientes,
  guardando,
  onAplicarCondicion,
  onIniciarMultiDiente,
  onCancelarMultiDiente,
  onCambiarEstado,
  onEliminarHallazgo,
  onGuardarNota,
  onGuardarCambios,
  onCancelar,
  onAbrirLeyenda,
}: PanelHerramientasProps) {
  const condicionesDisponibles = seleccion
    ? CATALOGO_ODONTOGRAMA.filter((c) => {
        if (c.exclusivoNino && denticion !== "NINO") return false;
        if (seleccion.superficie !== null) return c.aplicaA === "SUPERFICIE" || c.aplicaA === "AMBAS";
        return c.aplicaA === "DIENTE" || c.aplicaA === "AMBAS";
      })
    : [];

  function alElegir(condicion: CondicionOdontograma, variante: string | null) {
    if (condicion.multiDiente) {
      onIniciarMultiDiente(condicion.id);
      return;
    }
    onAplicarCondicion(condicion.id, variante);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.fila1}>
        <span className="text-body-sm" style={{ fontWeight: 600 }}>
          {seleccion &&
            `Diente ${seleccion.diente}${
              seleccion.superficie ? ` — ${NOMBRE_SUPERFICIE[seleccion.superficie]}` : ""
            }`}
        </span>
        <div className={styles.acciones}>
          <Button type="button" variant="outline" size="sm" onClick={onAbrirLeyenda}>
            Ver leyenda
          </Button>
          {hayCambiosPendientes && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={onGuardarCambios} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </Button>
            </>
          )}
        </div>
      </div>

      {!seleccion && (
        <p className={`text-body-sm ${styles.ayuda}`}>
          Haz clic en un diente o una superficie del diagrama para empezar.
        </p>
      )}

      {seleccion && (
        <>
          <div className={hallazgosSeleccion.length > 0 ? styles.fila2 : undefined}>
            <NotaTextarea
              key={`${seleccion.diente}-${seleccion.superficie ?? "diente"}-nota`}
              notaInicial={nota}
              onGuardar={onGuardarNota}
            />

            {hallazgosSeleccion.length > 0 && (
              <div className={styles.bloqueHallazgos}>
                <p className={`text-body-sm ${styles.subtitulo}`}>Hallazgos en esta selección</p>
                <ul className={styles.hallazgosLista}>
                  {hallazgosSeleccion.map((h) => {
                    const condicion = buscarCondicion(h.condicionId);
                    return (
                      <li key={h.id} className={styles.hallazgoItem}>
                        <div className={styles.hallazgoInfo}>
                          <SimboloHallazgo hallazgo={h} />
                          <span className="text-body-sm">
                            {condicion?.nombre ?? h.condicionId}
                            {h.variante && ` — ${formatearVariante(h.variante)}`}
                          </span>
                        </div>
                        <div className={styles.hallazgoAcciones}>
                          {condicion?.admiteEstadoColor && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onCambiarEstado(h)}
                            >
                              Marcar {h.estadoColor === "REALIZADO" ? "pendiente" : "realizado"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onEliminarHallazgo(h)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {pendienteMultiDiente ? (
            <div className={styles.bannerMultiDiente}>
              <span className="text-body-sm">Elige el diente adicional en el diagrama…</span>
              {errorMultiDiente && (
                <span className={`text-body-sm ${styles.errorMultiDiente}`} role="alert">
                  {errorMultiDiente}
                </span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={onCancelarMultiDiente}>
                Cancelar
              </Button>
            </div>
          ) : (
            <CatalogoCondiciones
              key={`${seleccion.diente}-${seleccion.superficie ?? "diente"}-catalogo`}
              condiciones={condicionesDisponibles}
              onElegir={alElegir}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Nota libre del contexto de selección actual — visible siempre que haya una selección,
 * con o sin hallazgos (segunda ronda de feedback: ya no hace falta un segundo clic + modal
 * para poder anotar algo). Guarda al perder foco, y solo si el texto cambió — se remonta
 * con `key` en cada cambio de selección para que el estado local no arrastre el valor de
 * un diente/superficie al siguiente. */
function NotaTextarea({
  notaInicial,
  onGuardar,
}: {
  notaInicial: string;
  onGuardar: (texto: string) => void;
}) {
  const [valor, setValor] = useState(notaInicial);

  return (
    <Textarea
      label="Nota"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        if (valor !== notaInicial) onGuardar(valor);
      }}
      rows={2}
    />
  );
}

/**
 * Catálogo de condiciones agrupado por categoría — pestañas horizontales (una activa a la
 * vez) en vez del Accordion vertical original: con el ancho completo disponible arriba del
 * diagrama, una fila de pestañas + una fila de condiciones que envuelve (wrap) ocupa menos
 * alto que una lista vertical, y sigue el mismo criterio "una sección abierta a la vez" que
 * ya tenía el Accordion en "modo única". Se remonta con `key` en cada cambio de selección
 * (mismo patrón que `NotaTextarea`) para no arrastrar la categoría activa de un diente al
 * siguiente.
 */
function CatalogoCondiciones({
  condiciones,
  onElegir,
}: {
  condiciones: CondicionOdontograma[];
  onElegir: (condicion: CondicionOdontograma, variante: string | null) => void;
}) {
  const categorias = CATEGORIAS_CONDICION.filter((categoria) =>
    condiciones.some((c) => c.categoria === categoria.id),
  );
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaCondicion | null>(
    categorias[0]?.id ?? null,
  );
  const condicionesActivas = condiciones.filter((c) => c.categoria === categoriaActiva);

  return (
    <div className={styles.fila3}>
      <p className={`text-body-sm ${styles.subtitulo}`}>Agregar condición</p>
      <div className={styles.categorias} role="tablist" aria-label="Categoría de condición">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            role="tab"
            aria-selected={categoria.id === categoriaActiva}
            className={`${styles.pestanaCategoria} ${
              categoria.id === categoriaActiva ? styles.pestanaCategoriaActiva : ""
            }`}
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>
      <ul className={styles.condiciones}>
        {condicionesActivas.map((c) => (
          <FilaCondicion key={c.id} condicion={c} onElegir={(variante) => onElegir(c, variante)} />
        ))}
      </ul>
    </div>
  );
}

/** Una condición clickable, en fila (chip) — si tiene variantes, un clic despliega los
 * botones de variante debajo en vez de aplicar de inmediato (sin modal, research posterior
 * a la primera versión: el modal quedó reservado solo para la nota). */
function FilaCondicion({
  condicion,
  onElegir,
}: {
  condicion: CondicionOdontograma;
  onElegir: (variante: string | null) => void;
}) {
  const [mostrarVariantes, setMostrarVariantes] = useState(false);

  function alClickFila() {
    if (condicion.variantes) {
      setMostrarVariantes((v) => !v);
      return;
    }
    onElegir(null);
  }

  return (
    <li className={styles.item}>
      <button type="button" className={styles.botonCondicion} onClick={alClickFila}>
        <SimboloCondicionPreview condicion={condicion} />
        <span className="text-body-sm">{condicion.nombre}</span>
      </button>
      {mostrarVariantes && condicion.variantes && (
        <div className={styles.variantes}>
          {condicion.variantes.map((v) => (
            <Button
              key={v}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMostrarVariantes(false);
                onElegir(v);
              }}
            >
              {v}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}
