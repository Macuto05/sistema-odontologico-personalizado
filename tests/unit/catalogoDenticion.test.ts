import { describe, expect, it } from "vitest";
import {
  CATALOGO_ODONTOGRAMA,
  catalogoParaDenticion,
  DIENTES_ADULTO,
  DIENTES_NINO,
} from "@/domain/entities/CondicionOdontograma";

describe("catalogoParaDenticion (US2, FR-012)", () => {
  it("excluye Pulpotomía y Pulpectomía en la vista Adulto", () => {
    const catalogo = catalogoParaDenticion("ADULTO");
    expect(catalogo.some((c) => c.id === "PULPOTOMIA")).toBe(false);
    expect(catalogo.some((c) => c.id === "PULPECTOMIA")).toBe(false);
  });

  it("incluye Pulpotomía y Pulpectomía en la vista Niño", () => {
    const catalogo = catalogoParaDenticion("NINO");
    expect(catalogo.some((c) => c.id === "PULPOTOMIA")).toBe(true);
    expect(catalogo.some((c) => c.id === "PULPECTOMIA")).toBe(true);
  });

  it("no excluye ninguna otra condición en la vista Adulto", () => {
    const catalogo = catalogoParaDenticion("ADULTO");
    expect(catalogo).toHaveLength(CATALOGO_ODONTOGRAMA.length - 2);
  });

  it("las 44 condiciones del catálogo están cubiertas en la vista Niño", () => {
    expect(catalogoParaDenticion("NINO")).toHaveLength(CATALOGO_ODONTOGRAMA.length);
  });

  it("la numeración FDI tiene 32 piezas para Adulto y 20 para Niño (research.md #7)", () => {
    expect(DIENTES_ADULTO).toHaveLength(32);
    expect(DIENTES_NINO).toHaveLength(20);
  });
});
