import { ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabOption<T extends string> {
  valor: T;
  etiqueta: string;
  /** Ficha de paciente (§6.10.1): tab con ícono, variante "subrayado". Ignorado en "pill". */
  icono?: ReactNode;
  /** Ej. "Planes", pendiente de implementar — tab visible pero no seleccionable todavía. */
  deshabilitada?: boolean;
}

interface TabsProps<T extends string> {
  opciones: TabOption<T>[];
  valorActivo: T;
  onCambiar: (valor: T) => void;
  /** "pill" (default, control segmentado — Panel de Atención) o "subrayado" (barra de
   * color debajo del tab activo, con ícono — ficha de paciente, docs/design-system.md
   * §6.10.1). "switch" (§6.22): pastilla blanca con sombra sobre fondo gris, estilo
   * "mockup DentalPro" — Pacientes (008-rediseno-visual-sistema); no reemplaza "pill" en
   * pantallas todavía no migradas a ese estilo. */
  variante?: "pill" | "subrayado" | "switch";
}

/**
 * Tabs — docs/design-system.md §6.10. Solo cambia estado de UI, nunca navega. La variante
 * "pill" reutiliza el mismo tratamiento visual del ítem activo de la Sidebar (§6.8); la
 * variante "subrayado" se agregó para la ficha de paciente sin tocar el comportamiento de
 * "pill" que ya usa el Panel de Atención.
 */
export function Tabs<T extends string>({
  opciones,
  valorActivo,
  onCambiar,
  variante = "pill",
}: TabsProps<T>) {
  const esSubrayado = variante === "subrayado";
  const esSwitch = variante === "switch";
  const contenedorClase = esSubrayado
    ? styles.contenedorSubrayado
    : esSwitch
      ? styles.contenedorSwitch
      : styles.contenedor;
  const tabClase = esSubrayado ? styles.tabSubrayado : esSwitch ? styles.tabSwitch : styles.tab;
  const activoClase = esSubrayado
    ? styles.activoSubrayado
    : esSwitch
      ? styles.activoSwitch
      : styles.activo;

  return (
    <div className={contenedorClase} role="tablist">
      {opciones.map((opcion) => {
        const activo = opcion.valor === valorActivo;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="tab"
            aria-selected={activo}
            disabled={opcion.deshabilitada}
            className={[tabClase, activo ? activoClase : ""].filter(Boolean).join(" ")}
            onClick={() => onCambiar(opcion.valor)}
            // Algunas extensiones del navegador (autocompletado de formularios) inyectan
            // atributos como fdprocessedid antes de que React hidrate — falso positivo de
            // mismatch, no un bug de la app (mismo caso que Input.tsx).
            suppressHydrationWarning
          >
            {esSubrayado && opcion.icono && (
              <span className={styles.icono} aria-hidden="true">
                {opcion.icono}
              </span>
            )}
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
