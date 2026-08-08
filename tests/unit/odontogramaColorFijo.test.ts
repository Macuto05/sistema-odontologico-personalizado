import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimboloBadge } from "@/components/odontograma/SimboloBadge";
import { SimboloCirculo } from "@/components/odontograma/SimboloCirculo";
import { SimboloCirculoDoble } from "@/components/odontograma/SimboloCirculoDoble";
import { SimboloCorona } from "@/components/odontograma/SimboloCorona";
import { SimboloGrafico } from "@/components/odontograma/SimboloGrafico";
import { SimboloLineaVertical } from "@/components/odontograma/SimboloLineaVertical";
import { LineaMultiDiente } from "@/components/odontograma/LineaMultiDiente";

/**
 * design-system.md §3.2.2 — el Odontograma usa --color-odontograma-azul (fijo) y
 * --color-error, nunca --color-primary/--color-ring/--color-*-accent (que sí cambian con
 * 007-tema-apariencia). Bug real reportado por el odontólogo: con el tema morado activo,
 * hallazgos guardados como "azules" se veían morados porque estos componentes leían
 * --color-primary directamente. Estos tests fijan el contrato para que no vuelva a pasar.
 * No hay jest-dom instalado en este proyecto — se usan aserciones planas sobre atributos
 * DOM, no matchers de testing-library.
 */
describe("Colores del Odontograma — fijos, independientes del tema de apariencia", () => {
  it("SimboloCirculo: AZUL usa --color-odontograma-azul, ROJO usa --color-error", () => {
    const azul = render(SimboloCirculo({ color: "AZUL", relleno: true }));
    expect(azul.container.querySelector("circle")?.getAttribute("fill")).toBe(
      "var(--color-odontograma-azul)",
    );
    azul.unmount();

    const rojo = render(SimboloCirculo({ color: "ROJO", relleno: true }));
    expect(rojo.container.querySelector("circle")?.getAttribute("fill")).toBe(
      "var(--color-error)",
    );
  });

  it("SimboloCirculoDoble: cada anillo respeta su propio color fijo", () => {
    const { container } = render(
      SimboloCirculoDoble({ colorInterno: "AZUL", colorExterno: "ROJO" }),
    );
    const [interno, externo] = Array.from(container.querySelectorAll("circle"));
    expect(interno?.getAttribute("fill")).toBe("var(--color-odontograma-azul)");
    expect(externo?.getAttribute("stroke")).toBe("var(--color-error)");
  });

  it("SimboloCorona (escala completo): AZUL usa --color-odontograma-azul", () => {
    const { container } = render(
      SimboloCorona({ relleno: true, color: "AZUL", escala: "completo" }),
    );
    expect(container.querySelector("path")?.getAttribute("fill")).toBe(
      "var(--color-odontograma-azul)",
    );
  });

  it("SimboloGrafico: AZUL usa --color-odontograma-azul en el trazo", () => {
    const { container } = render(SimboloGrafico({ variante: "LINEA_SOLIDA", color: "AZUL" }));
    expect(container.querySelector("line")?.getAttribute("stroke")).toBe(
      "var(--color-odontograma-azul)",
    );
  });

  it("SimboloLineaVertical (escala completo): AZUL usa --color-odontograma-azul", () => {
    const { container } = render(SimboloLineaVertical({ color: "AZUL", escala: "completo" }));
    const span = container.querySelector("span");
    expect(span?.style.backgroundColor).toBe("var(--color-odontograma-azul)");
  });

  it("SimboloBadge: la clase 'azul' se aplica (el token en sí lo fija SimboloBadge.module.css, §3.2.2)", () => {
    const { container } = render(SimboloBadge({ color: "AZUL", texto: "3" }));
    expect(container.querySelector("span")?.className).toContain("azul");
  });

  it("LineaMultiDiente: AZUL usa --color-odontograma-azul", () => {
    const { container } = render(
      LineaMultiDiente({
        hallazgo: { dientes: ["11", "12"] } as never,
        dientesArcada: ["11", "12"],
        variante: "LINEA_SOLIDA",
        color: "AZUL",
      }),
    );
    expect(container.querySelector("line")?.getAttribute("stroke")).toBe(
      "var(--color-odontograma-azul)",
    );
  });
});
