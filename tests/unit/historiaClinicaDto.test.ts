import { describe, expect, it } from "vitest";
import { crearPacienteInputSchema, editarPacienteInputSchema } from "@/application/dto/pacienteDto";

const datosValidos = {
  id: "b3f3a1b0-6f0a-4b1a-9f1a-2c9d3e4f5a6b",
  nombreCompleto: "Juana Pérez",
  documentoIdentidad: "12345678",
  fechaNacimiento: "1990-01-01",
};

describe("historia clínica — validación Zod (003-historia-clinica-paciente)", () => {
  it("acepta antecedentesPatologicos ausente y lo completa con [] (FR-009)", () => {
    const datos = crearPacienteInputSchema.parse(datosValidos);
    expect(datos.antecedentesPatologicos).toEqual([]);
  });

  it("acepta una combinación válida de antecedentes del catálogo fijo (FR-002, FR-005)", () => {
    const datos = crearPacienteInputSchema.parse({
      ...datosValidos,
      antecedentesPatologicos: ["DIABETES", "HIPERTENSION_HIPOTENSION", "OSTEOPOROSIS"],
    });
    expect(datos.antecedentesPatologicos).toEqual([
      "DIABETES",
      "HIPERTENSION_HIPOTENSION",
      "OSTEOPOROSIS",
    ]);
  });

  it("rechaza un antecedente patológico fuera del catálogo fijo (FR-002)", () => {
    expect(() =>
      crearPacienteInputSchema.parse({
        ...datosValidos,
        antecedentesPatologicos: ["GRIPE_COMUN"],
      }),
    ).toThrow();
  });

  it("acepta antecedentesPatologicosOtros ausente y lo completa con [] (revisión posterior: etiquetas, no texto libre)", () => {
    const datos = crearPacienteInputSchema.parse(datosValidos);
    expect(datos.antecedentesPatologicosOtros).toEqual([]);
  });

  it("recorta espacios y descarta etiquetas vacías en antecedentesPatologicosOtros", () => {
    const datos = crearPacienteInputSchema.parse({
      ...datosValidos,
      antecedentesPatologicosOtros: ["  Fractura de cadera  ", "   ", "Alergia al polen"],
    });
    expect(datos.antecedentesPatologicosOtros).toEqual(["Fractura de cadera", "Alergia al polen"]);
  });

  it("los 3 campos de etiquetas (heredofamiliares/medicamentos/alergias) ausentes se completan con []", () => {
    const datos = crearPacienteInputSchema.parse(datosValidos);
    expect(datos.antecedentesHeredofamiliares).toEqual([]);
    expect(datos.medicamentosActuales).toEqual([]);
    expect(datos.alergias).toEqual([]);
  });

  it("conserva los 3 campos de etiquetas con contenido, cada elemento independiente", () => {
    const datos = crearPacienteInputSchema.parse({
      ...datosValidos,
      antecedentesHeredofamiliares: ["Padre con diabetes", "Madre con hipertensión"],
      medicamentosActuales: ["Losartán 50mg"],
      alergias: ["Penicilina", "Látex"],
    });
    expect(datos.antecedentesHeredofamiliares).toEqual(["Padre con diabetes", "Madre con hipertensión"]);
    expect(datos.medicamentosActuales).toEqual(["Losartán 50mg"]);
    expect(datos.alergias).toEqual(["Penicilina", "Látex"]);
  });

  it("editarPacienteInputSchema hereda la misma validación de historia clínica", () => {
    const datos = editarPacienteInputSchema.parse({
      ...datosValidos,
      baseVersion: 1,
      antecedentesPatologicos: ["ARTRITIS"],
      alergias: ["Penicilina"],
    });
    expect(datos.antecedentesPatologicos).toEqual(["ARTRITIS"]);
    expect(datos.alergias).toEqual(["Penicilina"]);
  });

  it("editarPacienteInputSchema rechaza un antecedente fuera del catálogo", () => {
    expect(() =>
      editarPacienteInputSchema.parse({
        ...datosValidos,
        baseVersion: 1,
        antecedentesPatologicos: ["INVALIDO"],
      }),
    ).toThrow();
  });
});
