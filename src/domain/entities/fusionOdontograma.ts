import { HallazgoDental, NotaDental } from "./Odontograma";

/** Contenido editable de un Odontograma — lo único que se fusiona/rebasa (id, version y
 * fechas los decide quien llama). */
export interface ContenidoOdontograma {
  hallazgos: HallazgoDental[];
  notas: NotaDental[];
}

/** Una nota por contexto (diente, superficie) — misma regla que `guardarNotaDental`. */
function claveNota(n: Pick<NotaDental, "diente" | "superficie">): string {
  return `${n.diente}|${n.superficie ?? ""}`;
}

/**
 * Une el contenido de dos Odontogramas que representan la MISMA pieza clínica (mismo
 * paciente + dentición) pero quedaron con ids distintos: el del servidor y un duplicado que
 * un dispositivo creó localmente porque el del servidor todavía no le había llegado (ver
 * `guardarOdontogramaRemoto` en syncEngine). Nada se descarta:
 * - Hallazgos: unión por id (los ids son UUID generados al marcar, no chocan entre
 *   dispositivos). Si el mismo id aparece en ambos, gana el del servidor.
 * - Notas: a lo sumo una por (diente, superficie); si ambos tienen nota en el mismo
 *   contexto, gana la registrada más recientemente.
 */
export function fusionarContenidoDuplicado(
  servidor: ContenidoOdontograma,
  local: ContenidoOdontograma,
): ContenidoOdontograma {
  const idsServidor = new Set(servidor.hallazgos.map((h) => h.id));
  const hallazgos = [...servidor.hallazgos, ...local.hallazgos.filter((h) => !idsServidor.has(h.id))];

  const notasPorContexto = new Map<string, NotaDental>();
  for (const n of [...servidor.notas, ...local.notas]) {
    const previa = notasPorContexto.get(claveNota(n));
    if (!previa || n.registradoEn > previa.registradoEn) notasPorContexto.set(claveNota(n), n);
  }

  return { hallazgos, notas: [...notasPorContexto.values()] };
}

/**
 * Reaplica los cambios sin guardar de un borrador (hechos sobre `base`) encima de una base
 * nueva que llegó mientras tanto (sync del servidor, o reconciliación de un duplicado) —
 * como un "rebase". Sin esto, la base nueva pisaba el borrador entero y se perdía lo que el
 * odontólogo había marcado sin guardar; y peor, si se conservaba el borrador tal cual, al
 * guardar se calculaban como "eliminados" todos los hallazgos de la base nueva que el
 * borrador viejo no conocía.
 * - Agregados en el borrador (id no está en `base`) → se suman.
 * - Eliminados en el borrador (id en `base`, no en el borrador) → se quitan de la nueva.
 * - Editados (mismo id, contenido distinto a `base`) → la versión del borrador reemplaza.
 * Notas: mismo criterio por contexto (diente, superficie).
 */
export function rebasarBorrador(
  base: ContenidoOdontograma,
  borrador: ContenidoOdontograma,
  nuevaBase: ContenidoOdontograma,
): ContenidoOdontograma {
  const baseHallazgos = new Map(base.hallazgos.map((h) => [h.id, h]));
  const borradorHallazgos = new Map(borrador.hallazgos.map((h) => [h.id, h]));

  const hallazgos: HallazgoDental[] = [];
  for (const h of nuevaBase.hallazgos) {
    const enBase = baseHallazgos.get(h.id);
    const enBorrador = borradorHallazgos.get(h.id);
    if (enBase && !enBorrador) continue; // eliminado en el borrador
    if (enBase && enBorrador && JSON.stringify(enBase) !== JSON.stringify(enBorrador)) {
      hallazgos.push(enBorrador); // editado en el borrador
      continue;
    }
    hallazgos.push(h);
  }
  const idsNuevaBase = new Set(nuevaBase.hallazgos.map((h) => h.id));
  for (const h of borrador.hallazgos) {
    if (!baseHallazgos.has(h.id) && !idsNuevaBase.has(h.id)) hallazgos.push(h); // agregado
  }

  const baseNotas = new Map(base.notas.map((n) => [claveNota(n), n]));
  const borradorNotas = new Map(borrador.notas.map((n) => [claveNota(n), n]));
  const notas = new Map(nuevaBase.notas.map((n) => [claveNota(n), n]));
  for (const clave of baseNotas.keys()) {
    if (!borradorNotas.has(clave)) notas.delete(clave); // nota borrada en el borrador
  }
  for (const [clave, n] of borradorNotas) {
    const enBase = baseNotas.get(clave);
    if (!enBase || enBase.texto !== n.texto) notas.set(clave, n); // nueva o editada
  }

  return { hallazgos, notas: [...notas.values()] };
}
