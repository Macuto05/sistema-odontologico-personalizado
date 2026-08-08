import { describe, expect, it } from "vitest";
import {
  CambioOdontograma,
  reconstruirHallazgosAlMomento,
  reconstruirNotasAlMomento,
} from "@/domain/entities/CambioOdontograma";
import { HallazgoDental, NotaDental } from "@/domain/entities/Odontograma";

const HALLAZGO_BASE: HallazgoDental = {
  id: "h1",
  condicionId: "caries",
  dientes: ["16"],
  superficie: "OCLUSAL_INCISAL",
  variante: null,
  estadoColor: null,
  nota: null,
  registradoEn: "2026-01-01T00:00:00.000Z",
};

function cambioFalso(overrides: Partial<CambioOdontograma> = {}): CambioOdontograma {
  return {
    id: "c1",
    odontogramaId: "o1",
    pacienteId: "p1",
    denticion: "ADULTO",
    tipoCambio: "AGREGADO",
    hallazgoId: "h1",
    notaId: null,
    dientes: ["16"],
    superficie: "OCLUSAL_INCISAL",
    descripcion: "Caries agregada",
    snapshot: HALLAZGO_BASE,
    registradoEn: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("reconstruirHallazgosAlMomento (pestaña Historial)", () => {
  it("un momento antes de cualquier cambio no devuelve nada", () => {
    const cambios = [cambioFalso({ registradoEn: "2026-01-02T00:00:00.000Z" })];
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-01T00:00:00.000Z")).toEqual([]);
  });

  it("un momento después de AGREGADO incluye el snapshot de ese momento", () => {
    const cambios = [cambioFalso({ registradoEn: "2026-01-02T00:00:00.000Z" })];
    const resultado = reconstruirHallazgosAlMomento(cambios, "2026-01-03T00:00:00.000Z");
    expect(resultado).toEqual([HALLAZGO_BASE]);
  });

  it("usa el snapshot del cambio más reciente <= momento, no el original", () => {
    const editado: HallazgoDental = { ...HALLAZGO_BASE, estadoColor: "REALIZADO" };
    const cambios = [
      cambioFalso({ registradoEn: "2026-01-01T00:00:00.000Z", snapshot: HALLAZGO_BASE }),
      cambioFalso({
        id: "c2",
        tipoCambio: "EDITADO",
        registradoEn: "2026-01-02T00:00:00.000Z",
        snapshot: editado,
      }),
    ];
    // Momento entre los dos cambios: todavía no se aplicó la edición.
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-01T12:00:00.000Z")).toEqual([
      HALLAZGO_BASE,
    ]);
    // Momento después de ambos: ya refleja el estado editado.
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-03T00:00:00.000Z")).toEqual([editado]);
  });

  it("un hallazgo eliminado no aparece en un momento posterior a la eliminación", () => {
    const cambios = [
      cambioFalso({ registradoEn: "2026-01-01T00:00:00.000Z" }),
      cambioFalso({
        id: "c2",
        tipoCambio: "ELIMINADO",
        registradoEn: "2026-01-02T00:00:00.000Z",
        snapshot: HALLAZGO_BASE,
      }),
    ];
    // Antes de eliminarse, todavía estaba.
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-01T12:00:00.000Z")).toEqual([
      HALLAZGO_BASE,
    ]);
    // Después de eliminarse, ya no.
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-03T00:00:00.000Z")).toEqual([]);
  });

  it("ignora cambios sin snapshot (registros de antes de este campo)", () => {
    const cambios = [cambioFalso({ snapshot: null })];
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-03T00:00:00.000Z")).toEqual([]);
  });

  it("ignora entradas CHECKPOINT (marcadores de cierre de sesión, sin hallazgo/nota propios)", () => {
    const cambios = [
      cambioFalso({ registradoEn: "2026-01-01T00:00:00.000Z" }),
      cambioFalso({
        id: "checkpoint-1",
        tipoCambio: "CHECKPOINT",
        hallazgoId: null,
        dientes: [],
        superficie: null,
        snapshot: null,
        descripcion: "1 cambio guardado",
        registradoEn: "2026-01-02T00:00:00.000Z",
      }),
    ];
    expect(reconstruirHallazgosAlMomento(cambios, "2026-01-03T00:00:00.000Z")).toEqual([
      HALLAZGO_BASE,
    ]);
  });

  it("cambios de otros hallazgos no se mezclan entre sí", () => {
    const otro: HallazgoDental = { ...HALLAZGO_BASE, id: "h2", dientes: ["17"] };
    const cambios = [
      cambioFalso({ registradoEn: "2026-01-01T00:00:00.000Z" }),
      cambioFalso({
        id: "c2",
        hallazgoId: "h2",
        dientes: ["17"],
        snapshot: otro,
        registradoEn: "2026-01-01T00:00:00.000Z",
      }),
    ];
    const resultado = reconstruirHallazgosAlMomento(cambios, "2026-01-03T00:00:00.000Z");
    expect(resultado).toHaveLength(2);
    expect(resultado.map((h) => h.id).sort()).toEqual(["h1", "h2"]);
  });
});

describe("reconstruirNotasAlMomento (pestaña Historial)", () => {
  const NOTA_BASE: NotaDental = {
    id: "n1",
    diente: "16",
    superficie: null,
    texto: "Sensible al frío",
    registradoEn: "2026-01-01T00:00:00.000Z",
  };

  it("reconstruye una nota vigente en un momento dado", () => {
    const cambios: CambioOdontograma[] = [
      cambioFalso({
        hallazgoId: null,
        notaId: "n1",
        dientes: ["16"],
        superficie: null,
        snapshot: NOTA_BASE,
        registradoEn: "2026-01-01T00:00:00.000Z",
      }),
    ];
    expect(reconstruirNotasAlMomento(cambios, "2026-01-02T00:00:00.000Z")).toEqual([NOTA_BASE]);
  });

  it("una nota eliminada no aparece después de eliminarse", () => {
    const cambios: CambioOdontograma[] = [
      cambioFalso({
        hallazgoId: null,
        notaId: "n1",
        snapshot: NOTA_BASE,
        registradoEn: "2026-01-01T00:00:00.000Z",
      }),
      cambioFalso({
        id: "c2",
        hallazgoId: null,
        notaId: "n1",
        tipoCambio: "ELIMINADO",
        snapshot: NOTA_BASE,
        registradoEn: "2026-01-02T00:00:00.000Z",
      }),
    ];
    expect(reconstruirNotasAlMomento(cambios, "2026-01-03T00:00:00.000Z")).toEqual([]);
  });
});
