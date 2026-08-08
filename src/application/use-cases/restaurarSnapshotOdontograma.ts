import { v4 as uuid } from "uuid";
import { IOdontogramaRepository } from "@/domain/repositories/IOdontogramaRepository";
import { ICambioOdontogramaRepository } from "@/domain/repositories/ICambioOdontogramaRepository";
import {
  HallazgoDental,
  NotaDental,
  Odontograma,
  ResultadoEdicionOdontograma,
} from "@/domain/entities/Odontograma";
import { CambioOdontograma, crearCambioOdontograma } from "@/domain/entities/CambioOdontograma";
import { buscarCondicion } from "@/domain/entities/CondicionOdontograma";

export interface RestaurarSnapshotOdontogramaRepos {
  odontogramaRepo: IOdontogramaRepository;
  cambioRepo: ICambioOdontogramaRepository;
}

export interface SnapshotOdontograma {
  hallazgos: HallazgoDental[];
  notas: NotaDental[];
}

function diferenciarHallazgos(
  actuales: HallazgoDental[],
  destino: HallazgoDental[],
  odontograma: Odontograma,
): CambioOdontograma[] {
  const porIdActual = new Map(actuales.map((h) => [h.id, h]));
  const porIdDestino = new Map(destino.map((h) => [h.id, h]));
  const cambios: CambioOdontograma[] = [];

  for (const [id, hallazgo] of porIdDestino) {
    const anterior = porIdActual.get(id);
    if (anterior && JSON.stringify(anterior) === JSON.stringify(hallazgo)) continue;
    const condicion = buscarCondicion(hallazgo.condicionId);
    cambios.push(
      crearCambioOdontograma(uuid(), {
        odontogramaId: odontograma.id,
        pacienteId: odontograma.pacienteId,
        denticion: odontograma.denticion,
        tipoCambio: anterior ? "EDITADO" : "AGREGADO",
        hallazgoId: id,
        dientes: hallazgo.dientes,
        superficie: hallazgo.superficie,
        condicionNombre: condicion?.nombre ?? hallazgo.condicionId,
        snapshot: hallazgo,
      }),
    );
  }
  for (const [id, hallazgo] of porIdActual) {
    if (porIdDestino.has(id)) continue;
    const condicion = buscarCondicion(hallazgo.condicionId);
    cambios.push(
      crearCambioOdontograma(uuid(), {
        odontogramaId: odontograma.id,
        pacienteId: odontograma.pacienteId,
        denticion: odontograma.denticion,
        tipoCambio: "ELIMINADO",
        hallazgoId: id,
        dientes: hallazgo.dientes,
        superficie: hallazgo.superficie,
        condicionNombre: condicion?.nombre ?? hallazgo.condicionId,
        snapshot: hallazgo,
      }),
    );
  }
  return cambios;
}

function diferenciarNotas(
  actuales: NotaDental[],
  destino: NotaDental[],
  odontograma: Odontograma,
): CambioOdontograma[] {
  const porIdActual = new Map(actuales.map((n) => [n.id, n]));
  const porIdDestino = new Map(destino.map((n) => [n.id, n]));
  const cambios: CambioOdontograma[] = [];

  for (const [id, nota] of porIdDestino) {
    const anterior = porIdActual.get(id);
    if (anterior && JSON.stringify(anterior) === JSON.stringify(nota)) continue;
    cambios.push(
      crearCambioOdontograma(uuid(), {
        odontogramaId: odontograma.id,
        pacienteId: odontograma.pacienteId,
        denticion: odontograma.denticion,
        tipoCambio: anterior ? "EDITADO" : "AGREGADO",
        notaId: id,
        dientes: [nota.diente],
        superficie: nota.superficie,
        snapshot: nota,
      }),
    );
  }
  for (const [id, nota] of porIdActual) {
    if (porIdDestino.has(id)) continue;
    cambios.push(
      crearCambioOdontograma(uuid(), {
        odontogramaId: odontograma.id,
        pacienteId: odontograma.pacienteId,
        denticion: odontograma.denticion,
        tipoCambio: "ELIMINADO",
        notaId: id,
        dientes: [nota.diente],
        superficie: nota.superficie,
        snapshot: nota,
      }),
    );
  }
  return cambios;
}

/**
 * Caso de uso: restaurar el odontograma a un snapshot anterior — usado por
 * deshacer/rehacer. No es un bypass silencioso de la auditoría (Principio III): compara el
 * snapshot destino contra el estado actual y emite un `CambioOdontograma` por cada
 * hallazgo/nota que efectivamente cambió (agregado/editado/eliminado), igual que habría
 * quedado si el usuario hubiera hecho esos cambios a mano — así
 * `reconstruirHallazgosAlMomento` (pestaña Historial) sigue siendo correcta después de un
 * deshacer/rehacer, en vez de quedar con un hallazgo "fantasma" desincronizado.
 */
export async function restaurarSnapshotOdontograma(
  repos: RestaurarSnapshotOdontogramaRepos,
  odontograma: Odontograma,
  destino: SnapshotOdontograma,
): Promise<ResultadoEdicionOdontograma> {
  const cambios = [
    ...diferenciarHallazgos(odontograma.hallazgos, destino.hallazgos, odontograma),
    ...diferenciarNotas(odontograma.notas, destino.notas, odontograma),
  ];

  const resultado = await repos.odontogramaRepo.editar(odontograma.id, {
    hallazgos: destino.hallazgos,
    notas: destino.notas,
    baseVersion: odontograma.version,
  });

  for (const cambio of cambios) {
    await repos.cambioRepo.registrar(cambio);
  }

  return resultado;
}
