/**
 * Catálogo estático de condiciones del Odontograma (006-odontograma) — dato fijo del
 * dominio, no una tabla de base de datos (research.md #1). Las 44 entradas y la numeración
 * FDI (research.md #7) fueron acordadas con la odontóloga durante el diseño de la feature.
 * Ver specs/006-odontograma/data-model.md §CondicionOdontograma.
 */

import { Denticion } from "./Odontograma";

export type CategoriaCondicion =
  | "AUSENCIA_EXTRACCION"
  | "PATOLOGIA"
  | "RESTAURACIONES"
  | "DESGASTE_SUPERFICIE"
  | "ENDODONCIA"
  | "PROTESIS"
  | "POSICION_ANOMALIAS"
  | "ORTODONCIA";

export const CATEGORIAS_CONDICION: { id: CategoriaCondicion; nombre: string }[] = [
  { id: "AUSENCIA_EXTRACCION", nombre: "Ausencia / Extracción" },
  { id: "PATOLOGIA", nombre: "Patología" },
  { id: "RESTAURACIONES", nombre: "Restauraciones" },
  { id: "DESGASTE_SUPERFICIE", nombre: "Desgaste de superficie" },
  { id: "ENDODONCIA", nombre: "Endodoncia" },
  { id: "PROTESIS", nombre: "Prótesis" },
  { id: "POSICION_ANOMALIAS", nombre: "Posición y anomalías" },
  { id: "ORTODONCIA", nombre: "Ortodoncia" },
];

export type ColorSimbolo = "ROJO" | "AZUL";

export type VarianteGrafico =
  | "X"
  /** Misma X que "X", pero se dibuja sobre la raíz del diente en vez de apilarse como
   * ícono chico sobre la corona (Resto radicular — clínicamente no queda corona, solo
   * raíz, a diferencia de "Por extraer" donde la corona sigue presente). */
  | "X_RAIZ"
  | "FLECHA_RECTA"
  | "FLECHA_CURVA"
  | "FLECHAS_CRUZADAS"
  | "ZIGZAG"
  /** Dos escalones de ángulo recto enfrentados — izquierda: horizontal abajo → sube →
   * horizontal a la derecha (termina arriba, apuntando al centro); derecha: horizontal
   * arriba → baja → horizontal a la derecha (termina abajo) — reflejo VERTICAL de la
   * izquierda, no lateral, con un hueco visible entre ambos. Símbolo real de Rebordes
   * desiguales, referencia dibujada a mano por la odontóloga y confirmada con ella; antes
   * usaba "ZIGZAG" (una sola línea diagonal en zigzag), que no es el símbolo correcto y se
   * confundía con Fractura (que sí usa "ZIGZAG"). */
  | "REBORDES"
  | "LINEA_DOBLE"
  /** Símbolo real de puente fijo — un punto (pilar) en cada extremo del tramo, unidos por
   * una doble línea separada (no una línea simple, que no se distinguía de Edentulismo).
   * Solo tiene sentido sobre `estiloMultiDiente: "TRAMO"` (Puente fijo). */
  | "PUENTE"
  /** Símbolo real de prótesis removible (DPR) — un paréntesis en cada extremo del tramo
   * (gancho/retenedor) con una onda continua que nace dentro de un paréntesis y termina
   * dentro del otro (no una línea punteada). Solo tiene sentido sobre
   * `estiloMultiDiente: "TRAMO"` (Prótesis removible). */
  | "DPR"
  | "LINEA_SOLIDA"
  | "LINEA_PUNTEADA"
  /** Línea vertical a lo largo de todo el diente (Tratamiento de conducto) — se renderiza
   * a la escala de la corona completa, no como ícono chico superpuesto. */
  | "LINEA_VERTICAL"
  | "FLECHA_APICAL"
  | "FLECHA_OCLUSAL"
  | "CUADRO";

/**
 * Unión discriminada — research.md #8: badge de texto+color para la mayoría, un set
 * acotado de símbolos gráficos SVG a medida para el resto. `CIRCULO`/`CIRCULO_DOBLE`/
 * `CORONA` se separaron de `GRAFICO` (revisión posterior a la primera versión funcionando)
 * porque necesitan parámetros propios que no encajaban en un ícono genérico: relleno
 * opcional, dos colores fijos simultáneos, o renderizarse a la escala de la corona
 * completa del diente en vez de como un ícono chico superpuesto.
 */
export type SimboloCondicion =
  | { tipo: "BADGE"; texto: string; color: ColorSimbolo }
  | { tipo: "GRAFICO"; variante: VarianteGrafico; color: ColorSimbolo }
  /** Círculo chico superpuesto, relleno o hueco (ej. Caries relleno vs. Absceso hueco, para
   * no confundirlos a simple vista). */
  | { tipo: "CIRCULO"; color: ColorSimbolo; relleno: boolean }
  /** Dos círculos concéntricos con colores fijos e independientes (Obturación defectuosa:
   * el interior representa la restauración existente, el exterior que está defectuosa) —
   * no varía con `estadoColor`. */
  | { tipo: "CIRCULO_DOBLE"; colorInterno: ColorSimbolo; colorExterno: ColorSimbolo }
  /** Pinta la corona completa del diente (no un ícono chico) — relleno u hueco (contorno
   * solamente), con una letra opcional superpuesta (Corona: relleno + "C"; Diente por
   * erupcionar: hueco, sin letra). */
  | { tipo: "CORONA"; relleno: boolean; color: ColorSimbolo; letra?: string };

export type AplicaA = "DIENTE" | "SUPERFICIE" | "AMBAS";

export interface CondicionOdontograma {
  id: string;
  nombre: string;
  categoria: CategoriaCondicion;
  simbolo: SimboloCondicion;
  /** Si true, el color renderizado viene de `HallazgoDental.estadoColor` (FR-005) — el
   * color de `simbolo` es solo el valor por defecto al crear el hallazgo. Si false, el
   * color de `simbolo` es fijo. */
  admiteEstadoColor: boolean;
  aplicaA: AplicaA;
  /** true solo para las condiciones que por definición abarcan más de un diente (FR-013 y
   * las que unen dos piezas: Diastema, Transposición, Fusión). */
  multiDiente: boolean;
  /** Solo se define cuando `multiDiente` es true — distingue cómo se calculan/dibujan los
   * dientes involucrados:
   * "TRAMO": un tramo físico contiguo (Puente fijo, Edentulismo, Prótesis removible) — al
   *   completarse se calculan también los dientes intermedios (no solo los 2 extremos
   *   clicados) y se dibuja una única línea continua que atraviesa toda la fila, incluidos
   *   los espacios entre dientes.
   * "PAR": un marcador entre/sobre 2 piezas puntuales sin tramo intermedio real (Diastema,
   *   Transposición, Fusión) — se guardan solo los 2 dientes clicados, cada uno sigue
   *   mostrando su propio ícono chico independiente, como el resto del catálogo.
   * "RANGO": mismo cálculo de dientes intermedios que "TRAMO" (diente de inicio + diente
   *   de fin de la misma arcada → se completa toda la fila entre ambos), pero sin línea:
   *   cada diente del rango muestra su propio ícono chico, como si se hubiera marcado uno
   *   por uno (Ortodoncia fija — feedback de la odontóloga: marcar diente por diente era un
   *   fastidio para un tramo largo de brackets). */
  estiloMultiDiente?: "TRAMO" | "PAR" | "RANGO";
  /** true solo para Pulpotomía y Pulpectomía — exclusivas de dentición Niño (FR-012). */
  exclusivoNino: boolean;
  variantes: string[] | null;
}

export const CATALOGO_ODONTOGRAMA: CondicionOdontograma[] = [
  // 1. Ausencia / Extracción
  {
    id: "AUSENTE",
    nombre: "Ausente",
    categoria: "AUSENCIA_EXTRACCION",
    simbolo: { tipo: "GRAFICO", variante: "X", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "POR_EXTRAER",
    nombre: "Por extraer",
    categoria: "AUSENCIA_EXTRACCION",
    simbolo: { tipo: "GRAFICO", variante: "X", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "DIENTE_POR_ERUPCIONAR",
    nombre: "Diente por erupcionar",
    categoria: "AUSENCIA_EXTRACCION",
    simbolo: { tipo: "CORONA", relleno: false, color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "RESTO_RADICULAR",
    nombre: "Resto radicular",
    categoria: "AUSENCIA_EXTRACCION",
    simbolo: { tipo: "GRAFICO", variante: "X_RAIZ", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "EDENTULISMO",
    nombre: "Edentulismo",
    categoria: "AUSENCIA_EXTRACCION",
    simbolo: { tipo: "GRAFICO", variante: "LINEA_SOLIDA", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "TRAMO",
    exclusivoNino: false,
    variantes: null,
  },

  // 2. Patología
  {
    id: "CARIES",
    nombre: "Caries",
    categoria: "PATOLOGIA",
    simbolo: { tipo: "CIRCULO", color: "ROJO", relleno: true },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "ABSCESO",
    nombre: "Absceso",
    categoria: "PATOLOGIA",
    // Hueco (no relleno) a propósito — para no confundirse con Caries a simple vista.
    simbolo: { tipo: "CIRCULO", color: "ROJO", relleno: false },
    admiteEstadoColor: false,
    aplicaA: "AMBAS",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "FISTULA",
    nombre: "Fístula",
    categoria: "PATOLOGIA",
    simbolo: { tipo: "BADGE", texto: "F", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "AMBAS",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "EXUDADO",
    nombre: "Exudado",
    categoria: "PATOLOGIA",
    simbolo: { tipo: "BADGE", texto: "EX", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "AMBAS",
    multiDiente: false,
    exclusivoNino: false,
    variantes: ["PURULENTO", "HEMORRAGICO"],
  },
  {
    id: "FRACTURA",
    nombre: "Fractura",
    categoria: "PATOLOGIA",
    simbolo: { tipo: "GRAFICO", variante: "ZIGZAG", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },

  // 3. Restauraciones
  {
    id: "RESTAURACION_OBTURACION",
    nombre: "Restauración / Obturación",
    categoria: "RESTAURACIONES",
    simbolo: { tipo: "CIRCULO", color: "AZUL", relleno: true },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "OBTURACION_TEMPORAL",
    nombre: "Obturación temporal",
    categoria: "RESTAURACIONES",
    simbolo: { tipo: "BADGE", texto: "OT", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "OBTURACION_DEFECTUOSA",
    nombre: "Obturación defectuosa",
    categoria: "RESTAURACIONES",
    // Interior azul = la restauración existente; exterior rojo = que está defectuosa.
    simbolo: { tipo: "CIRCULO_DOBLE", colorInterno: "AZUL", colorExterno: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "SELLANTE",
    nombre: "Sellante",
    categoria: "RESTAURACIONES",
    simbolo: { tipo: "BADGE", texto: "S", color: "ROJO" },
    admiteEstadoColor: true,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },

  // 4. Desgaste de superficie
  {
    id: "ABRASION",
    nombre: "Abrasión",
    categoria: "DESGASTE_SUPERFICIE",
    simbolo: { tipo: "BADGE", texto: "A", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "ATRICCION",
    nombre: "Atricción",
    categoria: "DESGASTE_SUPERFICIE",
    simbolo: { tipo: "BADGE", texto: "AT", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "EROSION",
    nombre: "Erosión",
    categoria: "DESGASTE_SUPERFICIE",
    simbolo: { tipo: "BADGE", texto: "ER", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "ABSFRACCION",
    nombre: "Absfracción",
    categoria: "DESGASTE_SUPERFICIE",
    simbolo: { tipo: "BADGE", texto: "ABS", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "REBORDES_DESIGUALES",
    nombre: "Rebordes desiguales",
    categoria: "DESGASTE_SUPERFICIE",
    simbolo: { tipo: "GRAFICO", variante: "REBORDES", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "SUPERFICIE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "DIASTEMA",
    nombre: "Diastema",
    categoria: "DESGASTE_SUPERFICIE",
    simbolo: { tipo: "GRAFICO", variante: "LINEA_DOBLE", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "PAR",
    exclusivoNino: false,
    variantes: null,
  },

  // 5. Endodoncia
  {
    id: "TRATAMIENTO_CONDUCTO",
    nombre: "Tratamiento de conducto",
    categoria: "ENDODONCIA",
    simbolo: { tipo: "GRAFICO", variante: "LINEA_VERTICAL", color: "ROJO" },
    admiteEstadoColor: true,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "PULPOTOMIA",
    nombre: "Pulpotomía",
    categoria: "ENDODONCIA",
    simbolo: { tipo: "BADGE", texto: "EPO", color: "ROJO" },
    admiteEstadoColor: true,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: true,
    variantes: null,
  },
  {
    id: "PULPECTOMIA",
    nombre: "Pulpectomía",
    categoria: "ENDODONCIA",
    simbolo: { tipo: "BADGE", texto: "EPE", color: "ROJO" },
    admiteEstadoColor: true,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: true,
    variantes: null,
  },

  // 6. Prótesis
  {
    id: "CORONA",
    nombre: "Corona",
    categoria: "PROTESIS",
    // Pinta la corona completa del diente — azul si está presente (realizada), roja si
    // está por realizar (revisión posterior: Corona también sigue la convención de estado).
    simbolo: { tipo: "CORONA", relleno: true, color: "AZUL", letra: "C" },
    admiteEstadoColor: true,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: ["DEFINITIVA", "TEMPORAL"],
  },
  {
    id: "PUENTE_FIJO",
    nombre: "Puente fijo",
    categoria: "PROTESIS",
    simbolo: { tipo: "GRAFICO", variante: "PUENTE", color: "AZUL" },
    admiteEstadoColor: true,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "TRAMO",
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "PROTESIS_REMOVIBLE",
    nombre: "Prótesis removible (DPR)",
    categoria: "PROTESIS",
    simbolo: { tipo: "GRAFICO", variante: "DPR", color: "AZUL" },
    admiteEstadoColor: true,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "TRAMO",
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "PROTESIS_DEFECTUOSA",
    nombre: "Prótesis defectuosa",
    categoria: "PROTESIS",
    simbolo: { tipo: "BADGE", texto: "PD", color: "ROJO" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "IMPLANTE",
    nombre: "Implante",
    categoria: "PROTESIS",
    simbolo: { tipo: "BADGE", texto: "IM", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "POSTE_PERNO",
    nombre: "Poste / Perno",
    categoria: "PROTESIS",
    simbolo: { tipo: "BADGE", texto: "PST", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },

  // 7. Posición y anomalías
  {
    id: "MIGRACION",
    nombre: "Migración",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "GRAFICO", variante: "FLECHA_RECTA", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "ROTACION",
    nombre: "Rotación",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "GRAFICO", variante: "FLECHA_CURVA", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "TRANSPOSICION",
    nombre: "Transposición",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "GRAFICO", variante: "FLECHAS_CRUZADAS", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "PAR",
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "SUPERNUMERARIO",
    nombre: "Supernumerario",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "S", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "IMPACTADO",
    nombre: "Impactado",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "I", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "SEMI_IMPACTADO",
    nombre: "Semi-impactado",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "SI", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "ECTOPICO",
    nombre: "Ectópico",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "ECT", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "INTRUSION",
    nombre: "Intrusión",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "GRAFICO", variante: "FLECHA_APICAL", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "EXTRUSION",
    nombre: "Extrusión",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "GRAFICO", variante: "FLECHA_OCLUSAL", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "FUSION",
    nombre: "Fusión",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "FUS", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "PAR",
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "GEMINACION",
    nombre: "Geminación",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "GEM", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "MACRODONCIA",
    nombre: "Macrodoncia",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "MAC", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "MICRODONCIA",
    nombre: "Microdoncia",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "MIC", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },
  {
    id: "DISCROMIA",
    nombre: "Discromía",
    categoria: "POSICION_ANOMALIAS",
    simbolo: { tipo: "BADGE", texto: "DISC", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: false,
    exclusivoNino: false,
    variantes: null,
  },

  // 8. Ortodoncia
  {
    id: "ORTODONCIA_FIJA",
    nombre: "Ortodoncia fija",
    categoria: "ORTODONCIA",
    simbolo: { tipo: "GRAFICO", variante: "CUADRO", color: "AZUL" },
    admiteEstadoColor: false,
    aplicaA: "DIENTE",
    multiDiente: true,
    estiloMultiDiente: "RANGO",
    exclusivoNino: false,
    variantes: null,
  },
];

/** Busca una condición del catálogo por id — `undefined` si no existe. */
export function buscarCondicion(condicionId: string): CondicionOdontograma | undefined {
  return CATALOGO_ODONTOGRAMA.find((c) => c.id === condicionId);
}

/** Catálogo filtrado por dentición (FR-012: Pulpotomía/Pulpectomía solo en Niño). */
export function catalogoParaDenticion(denticion: Denticion): CondicionOdontograma[] {
  if (denticion === "NINO") return CATALOGO_ODONTOGRAMA;
  return CATALOGO_ODONTOGRAMA.filter((c) => !c.exclusivoNino);
}

/** Numeración FDI — research.md #7. Arcada superior/inferior por separado para el layout
 * de DiagramaBoca, más el combinado para validaciones. */
export const DIENTES_ADULTO_SUPERIOR = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];
export const DIENTES_ADULTO_INFERIOR = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];
export const DIENTES_ADULTO = [...DIENTES_ADULTO_SUPERIOR, ...DIENTES_ADULTO_INFERIOR];

export const DIENTES_NINO_SUPERIOR = ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"];
export const DIENTES_NINO_INFERIOR = ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"];
export const DIENTES_NINO = [...DIENTES_NINO_SUPERIOR, ...DIENTES_NINO_INFERIOR];

export function dientesParaDenticion(denticion: Denticion): string[] {
  return denticion === "ADULTO" ? DIENTES_ADULTO : DIENTES_NINO;
}

/** Dentición a la que pertenece un número FDI — los números nunca se repiten entre ambas
 * (11–48 adulto, 51–85 niño), así que el odontograma unificado (adulto arriba/abajo, niño en
 * el medio) puede saber a qué Odontograma va cada clic solo por el número del diente. */
export function denticionDeDiente(diente: string): Denticion {
  return DIENTES_NINO.includes(diente) ? "NINO" : "ADULTO";
}
