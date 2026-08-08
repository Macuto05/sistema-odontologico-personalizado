import { v4 as uuid } from "uuid";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import { NotaDental, Odontograma, ResultadoEdicionOdontograma, Superficie } from "@/domain/entities/Odontograma";
import { crearCambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { notaDentalInputSchema } from "../dto/odontogramaDto";

export interface GuardarNotaDentalRepos {
  odontogramaRepo: IOdontogramaRepository;
  cambioRepo: ICambioOdontogramaRepository;
}

export interface DatosGuardarNotaDental {
  diente: string;
  superficie: Superficie | null;
  texto: string;
}

/**
 * Caso de uso: upsert de la nota libre de un contexto de selección (diente, superficie) —
 * a diferencia de los hallazgos (registrar/editar/eliminar como trío), acá hay como máximo
 * UNA nota por contexto, así que un solo caso de uso cubre los 3 casos:
 * - no existe nota + texto no vacío → crea (AGREGADO).
 * - existe nota + texto no vacío → reemplaza (EDITADO).
 * - existe nota + texto vacío → elimina (ELIMINADO).
 * - no existe nota + texto vacío → no-op (no persiste, no genera cambio).
 */
export async function guardarNotaDental(
  repos: GuardarNotaDentalRepos,
  odontograma: Odontograma,
  datosCrudos: DatosGuardarNotaDental,
): Promise<ResultadoEdicionOdontograma | null> {
  const texto = datosCrudos.texto.trim();
  const existente = odontograma.notas.find(
    (n) => n.diente === datosCrudos.diente && n.superficie === datosCrudos.superficie,
  );

  if (!existente && texto === "") {
    return null;
  }

  let notas: NotaDental[];
  let notaId: string;
  let tipoCambio: "AGREGADO" | "EDITADO" | "ELIMINADO";
  let snapshot: NotaDental;

  if (existente && texto === "") {
    notas = odontograma.notas.filter((n) => n.id !== existente.id);
    notaId = existente.id;
    tipoCambio = "ELIMINADO";
    snapshot = existente;
  } else {
    const nota = notaDentalInputSchema.parse({
      id: existente?.id ?? uuid(),
      diente: datosCrudos.diente,
      superficie: datosCrudos.superficie,
      texto,
      registradoEn: new Date().toISOString(),
    });
    notas = existente
      ? odontograma.notas.map((n) => (n.id === existente.id ? nota : n))
      : [...odontograma.notas, nota];
    notaId = nota.id;
    tipoCambio = existente ? "EDITADO" : "AGREGADO";
    snapshot = nota;
  }

  const resultado = await repos.odontogramaRepo.editar(odontograma.id, {
    hallazgos: odontograma.hallazgos,
    notas,
    baseVersion: odontograma.version,
  });

  const cambio = crearCambioOdontograma(uuid(), {
    odontogramaId: odontograma.id,
    pacienteId: odontograma.pacienteId,
    denticion: odontograma.denticion,
    tipoCambio,
    notaId,
    dientes: [datosCrudos.diente],
    superficie: datosCrudos.superficie,
    snapshot,
  });
  await repos.cambioRepo.registrar(cambio);

  return resultado;
}
