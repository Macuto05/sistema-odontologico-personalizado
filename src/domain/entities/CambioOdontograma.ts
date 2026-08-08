/**
 * Entidad de dominio CambioOdontograma (006-odontograma) — registro de auditoría
 * append-only del historial de cambios de un Odontograma (FR-009, FR-010, research.md
 * #3, #4). Sin dependencias de framework (Principio II).
 */

import { Denticion, HallazgoDental, NotaDental, Superficie } from "./Odontograma";

export type TipoCambioOdontograma = "AGREGADO" | "EDITADO" | "ELIMINADO" | "CHECKPOINT";

export interface CambioOdontograma {
  id: string;
  odontogramaId: string;
  pacienteId: string;
  denticion: Denticion;
  tipoCambio: TipoCambioOdontograma;
  /** Exactamente uno de hallazgoId/notaId está seteado — a qué tipo de entidad se refiere
   * este cambio. */
  hallazgoId: string | null;
  notaId: string | null;
  dientes: string[];
  superficie: Superficie | null;
  descripcion: string;
  /** Estado completo del hallazgo/nota en el momento de este cambio — `null` en registros
   * de antes de este campo (rediseño posterior, pestaña Historial). En AGREGADO/EDITADO es
   * el estado resultante; en ELIMINADO es el estado justo antes de borrarse (ver
   * `reconstruirHallazgosAlMomento`). */
  snapshot: HallazgoDental | NotaDental | null;
  registradoEn: string;
}

interface DatosBaseCambioOdontograma {
  odontogramaId: string;
  pacienteId: string;
  denticion: Denticion;
  tipoCambio: TipoCambioOdontograma;
  dientes: string[];
  superficie: Superficie | null;
  snapshot: HallazgoDental | NotaDental | null;
}

export type DatosNuevoCambioOdontograma =
  | (DatosBaseCambioOdontograma & { hallazgoId: string; condicionNombre: string })
  | (DatosBaseCambioOdontograma & { notaId: string });

// CHECKPOINT nunca pasa por `describirCambioOdontograma` (su descripción la arma
// `crearCheckpointOdontograma` directamente) — esta entrada solo completa el Record.
const VERBO_POR_TIPO: Record<TipoCambioOdontograma, string> = {
  AGREGADO: "agregada",
  EDITADO: "editada",
  ELIMINADO: "eliminada",
  CHECKPOINT: "",
};

const NOMBRE_SUPERFICIE: Record<Superficie, string> = {
  MESIAL: "mesial",
  DISTAL: "distal",
  VESTIBULAR: "vestibular",
  PALATINO_LINGUAL: "palatino/lingual",
  OCLUSAL_INCISAL: "oclusal/incisal",
};

/** Genera el texto legible de `descripcion` para un CambioOdontograma nuevo. */
export function describirCambioOdontograma(datos: DatosNuevoCambioOdontograma): string {
  const piezas =
    datos.dientes.length > 1
      ? `los dientes ${datos.dientes.join(", ")}`
      : `el diente ${datos.dientes[0] ?? "?"}`;
  const superficieTexto = datos.superficie
    ? ` en superficie ${NOMBRE_SUPERFICIE[datos.superficie]}`
    : "";
  const sujeto = "condicionNombre" in datos ? datos.condicionNombre : "Nota";
  return `${sujeto} ${VERBO_POR_TIPO[datos.tipoCambio]}${superficieTexto} en ${piezas}`;
}

/** Construye el CambioOdontograma completo (id generado por el llamador) — sin persistirlo. */
export function crearCambioOdontograma(
  id: string,
  datos: DatosNuevoCambioOdontograma,
): CambioOdontograma {
  return {
    id,
    odontogramaId: datos.odontogramaId,
    pacienteId: datos.pacienteId,
    denticion: datos.denticion,
    tipoCambio: datos.tipoCambio,
    hallazgoId: "hallazgoId" in datos ? datos.hallazgoId : null,
    notaId: "notaId" in datos ? datos.notaId : null,
    dientes: datos.dientes,
    superficie: datos.superficie,
    descripcion: describirCambioOdontograma(datos),
    snapshot: datos.snapshot,
    registradoEn: new Date().toISOString(),
  };
}

interface DatosNuevoCheckpointOdontograma {
  odontogramaId: string;
  pacienteId: string;
  denticion: Denticion;
  descripcion: string;
}

/**
 * Construye un CHECKPOINT — marcador de "cierre de sesión de edición" (botón Listo en la
 * ficha, o Finalizar atención en una Cita), sin diente/hallazgo/nota puntual
 * (`hallazgoId`/`notaId`/`snapshot` quedan en null; a diferencia de AGREGADO/EDITADO/
 * ELIMINADO, un checkpoint no describe un cambio puntual). Revisión posterior a la primera
 * versión de la pestaña Historial: la odontóloga no quiere una entrada por cada hallazgo
 * agregado/editado — solo un "cómo se veía antes" por sesión de edición terminada, para no
 * llenar la base de datos de entradas ruidosas. `reconstruirHallazgosAlMomento`/
 * `reconstruirNotasAlMomento` ya ignoran estas filas (no tienen hallazgoId/notaId) — el
 * log granular sigue completo debajo para poder reconstruir cualquier momento exacto.
 */
export function crearCheckpointOdontograma(
  id: string,
  datos: DatosNuevoCheckpointOdontograma,
): CambioOdontograma {
  return {
    id,
    odontogramaId: datos.odontogramaId,
    pacienteId: datos.pacienteId,
    denticion: datos.denticion,
    tipoCambio: "CHECKPOINT",
    hallazgoId: null,
    notaId: null,
    dientes: [],
    superficie: null,
    descripcion: datos.descripcion,
    snapshot: null,
    registradoEn: new Date().toISOString(),
  };
}

/**
 * Reconstruye qué hallazgos estaban vigentes en un momento pasado, a partir del log de
 * auditoría append-only — sin guardar ninguna fila extra por fecha (pestaña Historial,
 * rediseño posterior). Por cada `hallazgoId`, toma el cambio más reciente con
 * `registradoEn <= momento`; si ese último cambio conocido a esa altura fue ELIMINADO, el
 * hallazgo no estaba — si no, se usa su `snapshot`. Cambios sin `snapshot` (registros de
 * antes de este campo) se ignoran silenciosamente: no hay forma de saber cómo se veían.
 */
export function reconstruirHallazgosAlMomento(
  cambios: CambioOdontograma[],
  momento: string,
): HallazgoDental[] {
  const ultimoPorHallazgo = new Map<string, CambioOdontograma>();
  for (const cambio of cambios) {
    if (!cambio.hallazgoId || cambio.registradoEn > momento) continue;
    const actual = ultimoPorHallazgo.get(cambio.hallazgoId);
    if (!actual || cambio.registradoEn > actual.registradoEn) {
      ultimoPorHallazgo.set(cambio.hallazgoId, cambio);
    }
  }
  const hallazgos: HallazgoDental[] = [];
  for (const cambio of ultimoPorHallazgo.values()) {
    if (cambio.tipoCambio === "ELIMINADO" || !cambio.snapshot) continue;
    hallazgos.push(cambio.snapshot as HallazgoDental);
  }
  return hallazgos;
}

/** Misma lógica que `reconstruirHallazgosAlMomento`, para notas libres vía `notaId`. */
export function reconstruirNotasAlMomento(cambios: CambioOdontograma[], momento: string): NotaDental[] {
  const ultimoPorNota = new Map<string, CambioOdontograma>();
  for (const cambio of cambios) {
    if (!cambio.notaId || cambio.registradoEn > momento) continue;
    const actual = ultimoPorNota.get(cambio.notaId);
    if (!actual || cambio.registradoEn > actual.registradoEn) {
      ultimoPorNota.set(cambio.notaId, cambio);
    }
  }
  const notas: NotaDental[] = [];
  for (const cambio of ultimoPorNota.values()) {
    if (cambio.tipoCambio === "ELIMINADO" || !cambio.snapshot) continue;
    notas.push(cambio.snapshot as NotaDental);
  }
  return notas;
}
