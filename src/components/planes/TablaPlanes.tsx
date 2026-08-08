"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { formatearFecha } from "@/components/pacientes/formatearFecha";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import styles from "./PlanesTab.module.css";

interface TablaPlanesProps {
  items: ItemPlanTratamiento[];
  mensajeVacio: string;
  soloLectura: boolean;
  /** Ausente ⇒ el checkbox se muestra pero inerte (009-planes-tratamiento, US2 lo conecta). */
  onMarcarRealizado?: (item: ItemPlanTratamiento, realizado: boolean) => void;
  /** Ausente ⇒ la nota se muestra pero no editable (009-planes-tratamiento, US4 lo conecta). */
  onGuardarNota?: (item: ItemPlanTratamiento, nota: string) => void;
}

/**
 * Tabla presentacional reutilizada por las dos vistas de la pestaña Planes ("Todos los
 * planes" y "Planes Realizados", research.md #2 de 009-planes-tratamiento — mismo
 * componente, filas distintas, nunca una segunda consulta). Fecha de creación, diente y
 * tratamiento son de solo lectura acá — esos y la eliminación siguen siendo exclusivos del
 * tab Odontograma (FR-010).
 */
export function TablaPlanes({
  items,
  mensajeVacio,
  soloLectura,
  onMarcarRealizado,
  onGuardarNota,
}: TablaPlanesProps) {
  if (items.length === 0) {
    return (
      <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
        {mensajeVacio}
      </p>
    );
  }

  return (
    <div className={styles.tablaContenedor}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Fecha de creación</th>
            <th>Diente</th>
            <th>Tratamiento</th>
            <th>Realizado</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatearFecha(item.fecha)}</td>
              <td>{item.diente ?? "—"}</td>
              <td>{item.tratamiento}</td>
              <td>
                <CeldaRealizado
                  item={item}
                  soloLectura={soloLectura}
                  onMarcarRealizado={onMarcarRealizado}
                />
              </td>
              <td>
                <CeldaNota item={item} soloLectura={soloLectura} onGuardarNota={onGuardarNota} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CeldaRealizado({
  item,
  soloLectura,
  onMarcarRealizado,
}: {
  item: ItemPlanTratamiento;
  soloLectura: boolean;
  onMarcarRealizado?: (item: ItemPlanTratamiento, realizado: boolean) => void;
}) {
  const realizado = item.fechaRealizado !== null;
  return (
    <div className={styles.celdaRealizado}>
      <Checkbox
        label="Realizado"
        checked={realizado}
        disabled={soloLectura || !onMarcarRealizado}
        onChange={(e) => onMarcarRealizado?.(item, e.target.checked)}
      />
      {realizado && (
        <span className="text-caption" style={{ color: "var(--color-muted-foreground)" }}>
          {formatearFecha(item.fechaRealizado!)}
        </span>
      )}
    </div>
  );
}

/** Guarda al perder foco, solo si el texto cambió — mismo patrón que `NotaTextarea` del tab
 * Odontograma. Cada fila ya es su propia instancia estable (key={item.id} en la tabla), así
 * que no hace falta remontar nada al cambiar de ítem. */
function CeldaNota({
  item,
  soloLectura,
  onGuardarNota,
}: {
  item: ItemPlanTratamiento;
  soloLectura: boolean;
  onGuardarNota?: (item: ItemPlanTratamiento, nota: string) => void;
}) {
  const [valor, setValor] = useState(item.nota ?? "");

  return (
    <Input
      aria-label={`Nota de ${item.tratamiento}`}
      value={valor}
      disabled={soloLectura || !onGuardarNota}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        if (valor !== (item.nota ?? "")) onGuardarNota?.(item, valor);
      }}
    />
  );
}
