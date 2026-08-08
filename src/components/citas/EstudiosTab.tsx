"use client";

import { FormEvent, useState } from "react";
import { v4 as uuid } from "uuid";
import { EstudioItem } from "@/domain/entities/Cita";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./EstudiosTab.module.css";

interface EstudiosTabProps {
  items: EstudioItem[];
  onChange: (items: EstudioItem[]) => void;
}

const VACIO = { nombre: "", motivo: "" };

/**
 * Pestaña "Estudios complementarios" del panel de Atención (US4, FR-009, FR-010).
 * Componente controlado: la lista vive en el borrador de `PanelAtencion`, no se persiste
 * acá. Adjuntar archivos de resultado (US8, FR-017) solo tiene sentido una vez que la Cita
 * existe —es decir, después de "Finalizar atención"— y se hace desde el Historial de citas
 * anteriores (`CitaDetalleSoloLectura`), no desde este borrador. Rediseño visual posterior
 * (008-rediseno-visual-sistema): mismo patrón de tarjeta que Receta — edición in situ
 * además de eliminar. Imprimir/compartir se sacaron de acá (quedaron sin funcionalidad
 * desde que se agregaron) — imprimir vive en "Detalle de la cita" una vez finalizada
 * (`CitasTab` → `RecetaImprimible`, §6.24).
 */
export function EstudiosTab({ items, onChange }: EstudiosTabProps) {
  const [nuevoItem, setNuevoItem] = useState(VACIO);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function onAgregar(e: FormEvent) {
    e.preventDefault();
    if (editandoId) {
      onChange(
        items.map((item) =>
          item.id === editandoId
            ? { ...item, nombre: nuevoItem.nombre, motivo: nuevoItem.motivo || null }
            : item,
        ),
      );
    } else {
      const item: EstudioItem = {
        id: uuid(),
        nombre: nuevoItem.nombre,
        motivo: nuevoItem.motivo || null,
        archivos: [],
      };
      onChange([...items, item]);
    }
    cerrarFormulario();
  }

  function onEditar(item: EstudioItem) {
    setNuevoItem({ nombre: item.nombre, motivo: item.motivo ?? "" });
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
          <h3 className={styles.tituloTarjeta}>Estudios solicitados</h3>
        </div>

        {items.length === 0 ? (
          <p className={`text-body-sm ${styles.vacio}`}>Sin estudios solicitados todavía.</p>
        ) : (
          <div className={styles.tablaWrapper}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Tipo de estudio</th>
                  <th>Indicación / Motivo</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.celdaPrincipal}>
                        <span className={styles.iconoFila} aria-hidden="true">
                          <IconoEstudio />
                        </span>
                        <p className={styles.nombreItem}>{item.nombre}</p>
                      </div>
                    </td>
                    <td className="text-body-sm">{item.motivo ?? "—"}</td>
                    <td>
                      <div className={styles.accionesFila}>
                        <button
                          type="button"
                          className={styles.iconoAccion}
                          onClick={() => onEditar(item)}
                          aria-label={`Editar ${item.nombre}`}
                          title="Editar"
                        >
                          <IconoLapiz />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconoAccion} ${styles.iconoAccionEliminar}`}
                          onClick={() => onQuitar(item.id)}
                          aria-label={`Quitar ${item.nombre}`}
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
                label="Estudio solicitado"
                value={nuevoItem.nombre}
                onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })}
                required
              />
              <Input
                label="Indicación / Motivo"
                value={nuevoItem.motivo}
                onChange={(e) => setNuevoItem({ ...nuevoItem, motivo: e.target.value })}
              />
            </div>
            <div className={styles.accionesFormulario}>
              <Button type="button" variant="outline" onClick={cerrarFormulario}>
                Cancelar
              </Button>
              <Button type="submit">{editandoId ? "Guardar cambios" : "Agregar estudio"}</Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className={styles.botonPunteado}
            onClick={() => setFormularioAbierto(true)}
          >
            <IconoMas />
            Agregar estudio
          </button>
        )}
      </div>
    </div>
  );
}

function IconoEstudio() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 2v6L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L15 8V2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 2h7M6 16h12" strokeLinecap="round" />
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
