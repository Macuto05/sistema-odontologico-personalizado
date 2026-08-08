"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ItemPlanTratamientoRepositoryDexie } from "@/infrastructure/db/dexie/ItemPlanTratamientoRepositoryDexie";
import { marcarRealizadoItemPlanTratamiento } from "@/application/use-cases/marcarRealizadoItemPlanTratamiento";
import { editarNotaItemPlanTratamiento } from "@/application/use-cases/editarNotaItemPlanTratamiento";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import { TablaPlanes } from "./TablaPlanes";
import styles from "./PlanesTab.module.css";

const repo = new ItemPlanTratamientoRepositoryDexie();

interface PlanesTabProps {
  pacienteId: string;
  soloLectura: boolean;
}

/**
 * Pestaña "Planes" (009-planes-tratamiento) — registro consolidado de `ItemPlanTratamiento`,
 * cuyo único origen sigue siendo la tabla "Plan de tratamiento" del tab Odontograma (FR-011,
 * sin cambios). Lee la misma `listarPorPaciente` ya existente — ninguna consulta nueva
 * (research.md #2). El checkbox "Realizado" y la nota (`TablaPlanes`) se guardan de
 * inmediato al interactuar, sin pasar por el modelo de borrador de Odontograma
 * (research.md #5) — por eso llaman directo a sus casos de uso, no a `setState` local.
 */
export function PlanesTab({ pacienteId, soloLectura }: PlanesTabProps) {
  const items = useLiveQuery(() => repo.listarPorPaciente(pacienteId), [pacienteId]);

  if (!items) {
    return <p className="text-body-sm">Cargando…</p>;
  }

  async function onMarcarRealizado(item: ItemPlanTratamiento, realizado: boolean) {
    await marcarRealizadoItemPlanTratamiento(repo, item.id, realizado, item.version);
  }

  async function onGuardarNota(item: ItemPlanTratamiento, nota: string) {
    await editarNotaItemPlanTratamiento(repo, item.id, nota, item.version);
  }

  // Filtro en memoria sobre el mismo array ya traído — no una segunda consulta ni una
  // entidad separada (research.md #2, FR-009): así ambas vistas están siempre
  // sincronizadas, sin ningún mecanismo extra que las pueda desincronizar. Particionado
  // (no "todos" + "realizados"): cada item vive en una sola tabla a la vez — feedback
  // directo, antes un plan marcado Realizado quedaba duplicado en ambas.
  const planesPendientes = items.filter((item) => item.fechaRealizado === null);
  const planesRealizados = items.filter((item) => item.fechaRealizado !== null);

  return (
    <div className={styles.contenedor}>
      <div className={styles.seccion}>
        <h3 className="text-heading-sm">Planes Pendientes</h3>
        <TablaPlanes
          items={planesPendientes}
          soloLectura={soloLectura}
          mensajeVacio="Todavía no hay planes de tratamiento registrados. Cargalos desde el tab Odontograma."
          onMarcarRealizado={onMarcarRealizado}
          onGuardarNota={onGuardarNota}
        />
      </div>

      <div className={styles.seccion}>
        <h3 className="text-heading-sm">Planes Realizados</h3>
        <TablaPlanes
          items={planesRealizados}
          soloLectura={soloLectura}
          mensajeVacio="Todavía no hay planes realizados."
          onMarcarRealizado={onMarcarRealizado}
          onGuardarNota={onGuardarNota}
        />
      </div>
    </div>
  );
}
