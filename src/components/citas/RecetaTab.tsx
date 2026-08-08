"use client";

import { FormEvent, useState } from "react";
import { v4 as uuid } from "uuid";
import { ItemReceta } from "@/domain/entities/Cita";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./RecetaTab.module.css";

interface RecetaTabProps {
  items: ItemReceta[];
  onChange: (items: ItemReceta[]) => void;
}

const VACIO = { medicamento: "", dosis: "", frecuencia: "", duracion: "", indicaciones: "" };

/**
 * Pestaña "Receta" del panel de Atención (US3, FR-007, FR-008). Componente controlado: la
 * lista de ítems vive en el borrador de `PanelAtencion`, no se persiste acá — se crea y
 * guarda junto con el resto de la atención al presionar "Finalizar atención". Rediseño
 * visual posterior (008-rediseno-visual-sistema): tarjeta con encabezado propio y edición
 * in situ además de eliminar, en vez de solo poder quitar filas. Imprimir/compartir se
 * sacaron de acá (quedaron sin funcionalidad desde que se agregaron) — imprimir vive en
 * "Detalle de la cita" una vez finalizada (`CitasTab` → `RecetaImprimible`, §6.24).
 */
export function RecetaTab({ items, onChange }: RecetaTabProps) {
  const [nuevoItem, setNuevoItem] = useState(VACIO);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function onAgregar(e: FormEvent) {
    e.preventDefault();
    if (editandoId) {
      onChange(
        items.map((item) =>
          item.id === editandoId
            ? { ...item, ...nuevoItem, indicaciones: nuevoItem.indicaciones || null }
            : item,
        ),
      );
    } else {
      const item: ItemReceta = {
        id: uuid(),
        medicamento: nuevoItem.medicamento,
        dosis: nuevoItem.dosis,
        frecuencia: nuevoItem.frecuencia,
        duracion: nuevoItem.duracion,
        indicaciones: nuevoItem.indicaciones || null,
      };
      onChange([...items, item]);
    }
    cerrarFormulario();
  }

  function onEditar(item: ItemReceta) {
    setNuevoItem({
      medicamento: item.medicamento,
      dosis: item.dosis,
      frecuencia: item.frecuencia,
      duracion: item.duracion,
      indicaciones: item.indicaciones ?? "",
    });
    setEditandoId(item.id);
    setFormularioAbierto(true);
  }

  function onQuitar(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function cerrarFormulario() {
    setNuevoItem(VACIO);
    setEditandoId(null);
    setFormularioAbierto(false);
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.tarjeta}>
        <div className={styles.encabezado}>
          <h3 className={styles.tituloTarjeta}>Medicamentos indicados</h3>
        </div>

        {items.length === 0 ? (
          <p className={`text-body-sm ${styles.vacio}`}>Sin medicamentos indicados todavía.</p>
        ) : (
          <div className={styles.tablaWrapper}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Dosis</th>
                  <th>Frecuencia</th>
                  <th>Duración</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.celdaPrincipal}>
                        <span className={styles.iconoFila} aria-hidden="true">
                          <IconoCapsula />
                        </span>
                        <div>
                          <p className={styles.nombreItem}>{item.medicamento}</p>
                          {item.indicaciones && (
                            <p className="text-caption" style={{ color: "var(--color-muted-foreground)" }}>
                              {item.indicaciones}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-body-sm">{item.dosis}</td>
                    <td className="text-body-sm">{item.frecuencia}</td>
                    <td>
                      <span className={styles.badgeDuracion}>{item.duracion}</span>
                    </td>
                    <td>
                      <div className={styles.accionesFila}>
                        <button
                          type="button"
                          className={styles.iconoAccion}
                          onClick={() => onEditar(item)}
                          aria-label={`Editar ${item.medicamento}`}
                          title="Editar"
                        >
                          <IconoLapiz />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconoAccion} ${styles.iconoAccionEliminar}`}
                          onClick={() => onQuitar(item.id)}
                          aria-label={`Quitar ${item.medicamento}`}
                          title="Quitar"
                        >
                          <IconoBasura />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {formularioAbierto ? (
          <form className={styles.formulario} onSubmit={onAgregar}>
            <div className={styles.grid}>
              <Input
                label="Medicamento"
                value={nuevoItem.medicamento}
                onChange={(e) => setNuevoItem({ ...nuevoItem, medicamento: e.target.value })}
                required
              />
              <Input
                label="Dosis"
                value={nuevoItem.dosis}
                onChange={(e) => setNuevoItem({ ...nuevoItem, dosis: e.target.value })}
                required
              />
              <Input
                label="Frecuencia"
                value={nuevoItem.frecuencia}
                onChange={(e) => setNuevoItem({ ...nuevoItem, frecuencia: e.target.value })}
                required
              />
              <Input
                label="Duración"
                value={nuevoItem.duracion}
                onChange={(e) => setNuevoItem({ ...nuevoItem, duracion: e.target.value })}
                required
              />
              <Input
                label="Indicaciones adicionales"
                value={nuevoItem.indicaciones}
                onChange={(e) => setNuevoItem({ ...nuevoItem, indicaciones: e.target.value })}
              />
            </div>
            <div className={styles.accionesFormulario}>
              <Button type="button" variant="outline" onClick={cerrarFormulario}>
                Cancelar
              </Button>
              <Button type="submit">{editandoId ? "Guardar cambios" : "Agregar medicamento"}</Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className={styles.botonPunteado}
            onClick={() => setFormularioAbierto(true)}
          >
            <IconoMas />
            Agregar medicamento
          </button>
        )}
      </div>
    </div>
  );
}

function IconoCapsula() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8.5 8.5 7 7" strokeLinecap="round" />
    </svg>
  );
}

function IconoLapiz() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoBasura() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function IconoMas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
