"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatearFecha } from "@/components/pacientes/formatearFecha";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import styles from "./PlanTratamientoTabla.module.css";

interface DatosLineaPlan {
  fecha: string;
  diente: string | null;
  tratamiento: string;
}

interface PlanTratamientoTablaProps {
  /** Borrador en memoria (no la base de datos) — lo persiste `OdontogramaTab` recién al
   * apretar "Guardar cambios", igual que los hallazgos del odontograma (feedback directo de
   * la odontóloga: nada se guarda hasta ese momento). */
  items: ItemPlanTratamiento[];
  soloLectura: boolean;
  onAgregar: (datos: DatosLineaPlan) => void;
  onEditar: (id: string, datos: DatosLineaPlan) => void;
  onEliminar: (id: string) => void;
}

/**
 * Tabla de plan de tratamiento (US5, FR-016, FR-017) — reemplaza el campo de texto libre
 * que existía en la pestaña Diagnóstico de 005-atencion-paciente. Componente controlado: no
 * lee ni escribe la base de datos directamente — `OdontogramaTab` es dueño del borrador y
 * decide cuándo persistirlo (research.md #5, #6, revisión posterior sobre guardado
 * diferido).
 */
export function PlanTratamientoTabla({
  items,
  soloLectura,
  onAgregar,
  onEditar,
  onEliminar,
}: PlanTratamientoTablaProps) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [diente, setDiente] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function limpiarFormulario() {
    setFecha(new Date().toISOString().slice(0, 10));
    setDiente("");
    setTratamiento("");
    setEditandoId(null);
  }

  function alGuardar() {
    if (tratamiento.trim() === "") return;
    const datos: DatosLineaPlan = { fecha, diente: diente.trim() === "" ? null : diente, tratamiento };
    if (editandoId) {
      onEditar(editandoId, datos);
    } else {
      onAgregar(datos);
    }
    limpiarFormulario();
  }

  function alEditar(item: ItemPlanTratamiento) {
    setFecha(item.fecha);
    setDiente(item.diente ?? "");
    setTratamiento(item.tratamiento);
    setEditandoId(item.id);
  }

  function alEliminar(item: ItemPlanTratamiento) {
    onEliminar(item.id);
    if (editandoId === item.id) limpiarFormulario();
  }

  return (
    <div className={styles.contenedor}>
      <h3 className="text-heading-sm">Plan de tratamiento</h3>

      {!soloLectura && (
        <div className={styles.formulario}>
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Input
            label="Elemento dentario (opcional)"
            value={diente}
            onChange={(e) => setDiente(e.target.value)}
            placeholder="Ej. 16"
          />
          <Input
            label="Tratamiento"
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
          />
          <div className={styles.accionesFormulario}>
            <Button type="button" onClick={alGuardar} disabled={tratamiento.trim() === ""}>
              {editandoId ? "Confirmar línea" : "Agregar"}
            </Button>
            {editandoId && (
              <Button type="button" variant="outline" onClick={limpiarFormulario}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Diente</th>
              <th>Tratamiento</th>
              {!soloLectura && <th aria-label="Acciones" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatearFecha(item.fecha)}</td>
                <td>{item.diente ?? "—"}</td>
                <td>{item.tratamiento}</td>
                {!soloLectura && (
                  <td className={styles.acciones}>
                    <Button type="button" variant="outline" size="sm" onClick={() => alEditar(item)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => alEliminar(item)}
                    >
                      Eliminar
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
          Todavía no hay líneas cargadas en el plan de tratamiento.
        </p>
      )}
    </div>
  );
}
