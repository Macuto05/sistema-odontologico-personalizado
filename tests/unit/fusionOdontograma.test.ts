import { describe, expect, it } from "vitest";
import { fusionarContenidoDuplicado, rebasarBorrador } from "@/domain/entities/fusionOdontograma";
import { HallazgoDental, NotaDental, Superficie } from "@/domain/entities/Odontograma";

function h(id: string, diente: string, condicionId = "CARIES", superficie: Superficie | null = "OCLUSAL_INCISAL"): HallazgoDental {
  return { id, condicionId, dientes: [diente], superficie, variante: null, estadoColor: null, nota: null, registradoEn: "2026-01-01T00:00:00.000Z" };
}
function n(id: string, diente: string, texto: string, registradoEn = "2026-01-01T00:00:00.000Z"): NotaDental {
  return { id, diente, superficie: null, texto, registradoEn };
}
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

describe("fusionarContenidoDuplicado", () => {
  it("une los hallazgos del servidor y del duplicado local sin perder ninguno", () => {
    const r = fusionarContenidoDuplicado(
      { hallazgos: [h("s1", "18"), h("s2", "16")], notas: [] },
      { hallazgos: [h("l1", "47")], notas: [] },
    );
    expect(ids(r.hallazgos)).toEqual(["l1", "s1", "s2"]);
  });

  it("si el mismo hallazgo está en ambos, queda uno solo y gana el del servidor", () => {
    const r = fusionarContenidoDuplicado(
      { hallazgos: [h("x", "18", "CARIES")], notas: [] },
      { hallazgos: [h("x", "18", "ABSCESO")], notas: [] },
    );
    expect(r.hallazgos).toHaveLength(1);
    expect(r.hallazgos[0]?.condicionId).toBe("CARIES");
  });

  it("notas en el mismo diente: queda la más reciente; en dientes distintos, ambas", () => {
    const r = fusionarContenidoDuplicado(
      { hallazgos: [], notas: [n("a", "11", "vieja", "2026-01-01T00:00:00.000Z"), n("b", "21", "servidor")] },
      { hallazgos: [], notas: [n("c", "11", "nueva", "2026-02-01T00:00:00.000Z")] },
    );
    expect(r.notas.map((x) => x.texto).sort()).toEqual(["nueva", "servidor"]);
  });
});

describe("rebasarBorrador", () => {
  const base = { hallazgos: [h("a", "18"), h("b", "16")], notas: [n("n1", "11", "texto")] };

  it("sin cambios en el borrador, el resultado es la nueva base", () => {
    const nueva = { hallazgos: [h("a", "18"), h("b", "16"), h("c", "14")], notas: [] };
    expect(rebasarBorrador(base, base, nueva)).toEqual({ hallazgos: nueva.hallazgos, notas: [] });
  });

  it("conserva lo agregado sin guardar y suma lo que llegó del servidor", () => {
    const borrador = { ...base, hallazgos: [...base.hallazgos, h("nuevo", "47")] };
    const nueva = { ...base, hallazgos: [...base.hallazgos, h("remoto", "36")] };
    expect(ids(rebasarBorrador(base, borrador, nueva).hallazgos)).toEqual(["a", "b", "nuevo", "remoto"]);
  });

  it("un hallazgo que el borrador viejo no conocía NO se trata como eliminado", () => {
    // Caso real: borrador hecho sobre un duplicado vacío; llega el del servidor con 2.
    const vacio = { hallazgos: [], notas: [] };
    const borrador = { hallazgos: [h("local", "47")], notas: [] };
    const servidor = { hallazgos: [h("s1", "18"), h("s2", "16")], notas: [] };
    expect(ids(rebasarBorrador(vacio, borrador, servidor).hallazgos)).toEqual(["local", "s1", "s2"]);
  });

  it("aplica eliminaciones y ediciones hechas en el borrador", () => {
    const editado = { ...h("b", "16"), estadoColor: "REALIZADO" as const };
    const borrador = { hallazgos: [editado], notas: base.notas }; // "a" eliminado, "b" editado
    const r = rebasarBorrador(base, borrador, base);
    expect(ids(r.hallazgos)).toEqual(["b"]);
    expect(r.hallazgos[0]?.estadoColor).toBe("REALIZADO");
  });

  it("notas: conserva la editada y la borrada en el borrador sigue borrada", () => {
    const editada = rebasarBorrador(base, { ...base, notas: [n("n1", "11", "editada")] }, base);
    expect(editada.notas.map((x) => x.texto)).toEqual(["editada"]);
    const borrada = rebasarBorrador(base, { ...base, notas: [] }, base);
    expect(borrada.notas).toEqual([]);
  });
});
