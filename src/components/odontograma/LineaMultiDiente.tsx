import { VarianteGrafico } from "@/domain/entities/CondicionOdontograma";
import { HallazgoDental } from "@/domain/entities/Odontograma";

interface LineaMultiDienteProps {
  hallazgo: HallazgoDental;
  /** Array FDI de la arcada donde se dibuja (mismo orden que las columnas renderizadas). */
  dientesArcada: string[];
  variante: VarianteGrafico;
  color: "ROJO" | "AZUL";
}

/** Ancho de cada columna .diente + el gap de .arcada — ver DienteSvg.module.css (.diente
 * { width: 52px }) y DiagramaBoca.module.css (.arcada { gap: 5px }). Coordenadas por
 * índice, no medición de DOM: robusto frente a scroll/timing y atraviesa los espacios
 * entre dientes con una sola línea recta (Parte C del plan). Escala 1.25x sobre los
 * valores originales (46/20/27) — diagrama agrandado para mejorar el toque en celular. */
const ANCHO_COLUMNA = 57;
const CENTRO_DIENTE = 25;
/** Altura dentro de .arcada donde pasa la línea — banda media de la corona (ver
 * DienteSvg: número ~13px + mitad de corona ~19px). */
const Y_TRAMO = 34;

/** Genera el `d` de un `<path>` de onda continua entre `x1` y `x2` a la altura `y`, con
 * amplitud y período fijos — para DPR (research: la onda nace dentro de un paréntesis y
 * termina dentro del otro, por eso corre de extremo a extremo, igual que la línea de
 * Puente fijo). El número de medias ondas se redondea al ancho real del tramo para que no
 * quede estirada ni comprimida en tramos largos o cortos. */
function generarOnda(x1: number, x2: number, y: number, amplitud: number, periodo: number): string {
  const ancho = x2 - x1;
  const medias = Math.max(4, Math.round((ancho / periodo) * 2));
  const paso = ancho / medias;
  let d = `M ${x1} ${y}`;
  for (let i = 0; i < medias; i++) {
    const xControl = x1 + paso * i + paso / 2;
    const xDestino = x1 + paso * (i + 1);
    const yControl = i % 2 === 0 ? y - amplitud : y + amplitud;
    d += ` Q ${xControl} ${yControl} ${xDestino} ${y}`;
  }
  return d;
}

/** Línea continua para una condición `estiloMultiDiente: "TRAMO"` (Puente fijo,
 * Edentulismo, Prótesis removible) — se dibuja una sola vez por hallazgo, del centro del
 * primer diente al centro del último, en vez de un ícono independiente por diente. */
export function LineaMultiDiente({ hallazgo, dientesArcada, variante, color }: LineaMultiDienteProps) {
  const indices = hallazgo.dientes
    .map((d) => dientesArcada.indexOf(d))
    .filter((i) => i >= 0);
  if (indices.length < 2) return null;

  const x1 = Math.min(...indices) * ANCHO_COLUMNA + CENTRO_DIENTE;
  const x2 = Math.max(...indices) * ANCHO_COLUMNA + CENTRO_DIENTE;
  const trazo = color === "ROJO" ? "var(--color-error)" : "var(--color-odontograma-azul)";

  if (variante === "PUENTE") {
    return (
      <g stroke={trazo} fill={trazo}>
        <circle cx={x1} cy={Y_TRAMO} r={4} stroke="none" />
        <circle cx={x2} cy={Y_TRAMO} r={4} stroke="none" />
        <line x1={x1 + 6} y1={Y_TRAMO - 2} x2={x2 - 6} y2={Y_TRAMO - 2} strokeWidth={1.5} />
        <line x1={x1 + 6} y1={Y_TRAMO + 2} x2={x2 - 6} y2={Y_TRAMO + 2} strokeWidth={1.5} />
      </g>
    );
  }

  if (variante === "DPR") {
    // Un par "()" completo abrazando cada diente extremo (no un solo gancho por extremo —
    // feedback directo con referencia visual: "en el diente de origen hay dos paréntesis
    // () y en el diente de destino hay otros dos paréntesis ()"), con la onda corriendo
    // de extremo a extremo por debajo. Trazo del paréntesis más grueso que el de la onda
    // (2.5x) para que se lea como símbolo propio, no como un tramo más de la onda.
    const alto = 10;
    const bulto = 7;
    const separacionPar = 9;
    const paren = (cx: number, abre: boolean) => {
      const control = abre ? cx - bulto : cx + bulto;
      return `M ${cx} ${Y_TRAMO - alto} Q ${control} ${Y_TRAMO} ${cx} ${Y_TRAMO + alto}`;
    };
    return (
      <g stroke={trazo} fill="none" strokeLinecap="round">
        <path d={generarOnda(x1, x2, Y_TRAMO, 2.5, 26)} strokeWidth={1.3} />
        <path d={paren(x1, true)} strokeWidth={3.2} />
        <path d={paren(x1 + separacionPar, false)} strokeWidth={3.2} />
        <path d={paren(x2 - separacionPar, true)} strokeWidth={3.2} />
        <path d={paren(x2, false)} strokeWidth={3.2} />
      </g>
    );
  }

  const dasharray = variante === "LINEA_PUNTEADA" ? "4,3" : undefined;

  return (
    <line
      x1={x1}
      y1={Y_TRAMO}
      x2={x2}
      y2={Y_TRAMO}
      stroke={trazo}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeDasharray={dasharray}
    />
  );
}

export { ANCHO_COLUMNA };
