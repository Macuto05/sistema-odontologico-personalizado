import { CondicionOdontograma, ColorSimbolo, buscarCondicion } from "@/domain/entities/CondicionOdontograma";
import { HallazgoDental } from "@/domain/entities/Odontograma";
import { SimboloBadge } from "./SimboloBadge";
import { SimboloGrafico } from "./SimboloGrafico";
import { SimboloCirculo } from "./SimboloCirculo";
import { SimboloCirculoDoble } from "./SimboloCirculoDoble";
import { SimboloCorona } from "./SimboloCorona";
import { SimboloLineaVertical } from "./SimboloLineaVertical";

type Escala = "completo" | "chico";

/** `CIRCULO_DOBLE` no tiene un único `color` (usa `colorInterno`/`colorExterno` fijos) — se
 * usa `colorExterno` como valor de referencia donde hace falta "un" color por defecto. */
function colorPorDefecto(condicion: CondicionOdontograma): ColorSimbolo {
  return condicion.simbolo.tipo === "CIRCULO_DOBLE"
    ? condicion.simbolo.colorExterno
    : condicion.simbolo.color;
}

/** "TEMPORAL" muestra "Ct" en vez de la "C" de Corona — es la única condición con
 * `variantes` y símbolo `CORONA` a la vez (FR-015); antes el dato quedaba guardado en el
 * hallazgo pero no tenía ningún efecto visual, así que era imposible distinguir una corona
 * temporal de una definitiva con solo mirar el diagrama. */
function letraCorona(letraPorDefecto: string | undefined, variante: string | null): string | undefined {
  return variante === "TEMPORAL" ? "Ct" : letraPorDefecto;
}

function renderSimbolo(
  condicion: CondicionOdontograma,
  color: ColorSimbolo,
  escala: Escala,
  variante: string | null = null,
) {
  const simbolo = condicion.simbolo;
  switch (simbolo.tipo) {
    case "BADGE":
      return <SimboloBadge texto={simbolo.texto} color={color} />;
    case "GRAFICO":
      if (simbolo.variante === "LINEA_VERTICAL") {
        return <SimboloLineaVertical color={color} escala={escala} />;
      }
      return <SimboloGrafico variante={simbolo.variante} color={color} />;
    case "CIRCULO":
      return <SimboloCirculo color={color} relleno={simbolo.relleno} />;
    case "CIRCULO_DOBLE":
      return (
        <SimboloCirculoDoble
          colorInterno={simbolo.colorInterno}
          colorExterno={simbolo.colorExterno}
        />
      );
    case "CORONA":
      return (
        <SimboloCorona
          relleno={simbolo.relleno}
          color={color}
          letra={letraCorona(simbolo.letra, variante)}
          escala={escala}
        />
      );
    default:
      return null;
  }
}

/**
 * true para los símbolos que deben pintar la corona completa del diente (Corona,
 * Tratamiento de conducto) en vez de superponerse como un ícono chico — `DienteSvg` los
 * ubica en su propio contenedor absoluto, separado de la lista de íconos chicos.
 */
export function esSimboloCoronaCompleta(condicion: CondicionOdontograma): boolean {
  return (
    condicion.simbolo.tipo === "CORONA" ||
    (condicion.simbolo.tipo === "GRAFICO" && condicion.simbolo.variante === "LINEA_VERTICAL")
  );
}

/**
 * true para los símbolos que deben pintarse sobre la raíz del diente (Resto radicular) en
 * vez de apilarse como ícono chico sobre la corona — `DienteSvg` los ubica superpuestos al
 * div `.raiz`, separados de la lista de íconos chicos y de los símbolos de corona completa.
 */
export function esSimboloRaizCompleta(condicion: CondicionOdontograma): boolean {
  return condicion.simbolo.tipo === "GRAFICO" && condicion.simbolo.variante === "X_RAIZ";
}

/** Símbolo de una condición del catálogo con su color por defecto — usado en el panel de
 * herramientas y la leyenda (referencia, no un hallazgo concreto) — siempre a escala
 * "chico". */
export function SimboloCondicionPreview({ condicion }: { condicion: CondicionOdontograma }) {
  return renderSimbolo(condicion, colorPorDefecto(condicion), "chico");
}

/**
 * Color real de un hallazgo concreto — si la condición admite estado, viene de
 * `hallazgo.estadoColor` (FR-005), no del valor por defecto del catálogo. Compartido entre
 * `SimboloHallazgo` (íconos normales) y `DiagramaBoca` (línea de condiciones "TRAMO" como
 * Puente fijo/Edentulismo/Prótesis removible) — antes cada uno resolvía el color por su
 * cuenta y la línea de TRAMO se había quedado usando siempre el color por defecto del
 * catálogo, ignorando el estado pendiente/realizado (bug encontrado y corregido).
 */
export function colorDeHallazgo(condicion: CondicionOdontograma, hallazgo: HallazgoDental): ColorSimbolo {
  return condicion.admiteEstadoColor
    ? hallazgo.estadoColor === "REALIZADO"
      ? "AZUL"
      : "ROJO"
    : colorPorDefecto(condicion);
}

/**
 * Símbolo de un hallazgo concreto ya marcado en el diagrama — ver `colorDeHallazgo`.
 * `escala="completo"` la usa `DienteSvg` para los símbolos de corona completa, ubicados en
 * su contenedor absoluto dedicado (ver `esSimboloCoronaCompleta`).
 */
export function SimboloHallazgo({
  hallazgo,
  escala = "chico",
}: {
  hallazgo: HallazgoDental;
  escala?: Escala;
}) {
  const condicion = buscarCondicion(hallazgo.condicionId);
  if (!condicion) return null;
  return renderSimbolo(condicion, colorDeHallazgo(condicion, hallazgo), escala, hallazgo.variante);
}
