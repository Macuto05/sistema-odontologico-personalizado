"use client";

import Link from "next/link";
import { useSidebarColapsada } from "./SidebarContext";
import { SyncStatusPill } from "./SyncStatusPill";
import styles from "./TopAppBar.module.css";

export interface TopAppBarProps {
  searchPlaceholder?: string;
  /** Nombre accesible del buscador — puede ser más descriptivo que el placeholder visible
   * (§4.1, docs/design-system.md). Por defecto usa el placeholder. */
  searchAriaLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Enter en el buscador — navega a otra pantalla (ej. Inicio/Configuración navegan a
   * /pacientes con el criterio). Pacientes no lo usa: ahí escribir ya filtra la lista en el
   * lugar, no hace falta enviar nada. */
  onSearchSubmit?: () => void;
  newItemButton?: {
    label: string;
    href: string;
  };
}

function IconoSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/** Engranaje simple — anillo + 8 dientes radiales cada 45°, en vez de un path dibujado a
 * mano (el intento anterior quedó torcido/irreconocible). Geometría explícita, no depende
 * de recordar un path SVG largo. */
function IconoSettings() {
  const angulos = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.5" />
      {angulos.map((angulo) => (
        <line
          key={angulo}
          x1="12"
          y1="3.3"
          x2="12"
          y2="1.3"
          transform={`rotate(${angulo} 12 12)`}
        />
      ))}
    </svg>
  );
}

export function TopAppBar({
  searchPlaceholder = "Buscar paciente...",
  searchAriaLabel,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  newItemButton,
}: TopAppBarProps) {
  const colapsada = useSidebarColapsada();

  return (
    <header className={`${styles.topAppBar} ${colapsada ? styles.colapsada : ""}`}>
      <div className={styles.left}>
        <div className={styles.searchContainer}>
          <IconoSearch />
          <input
            type="text"
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel ?? searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchSubmit?.();
            }}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.right}>
        {/* Antes del engranaje: agrupado con el resto del "estado del sistema", fuera del
            flujo de acción principal (buscar, crear) — 011-indicador-sincronizacion. */}
        <SyncStatusPill />

        <Link href="/configuracion" className={styles.linkReset}>
          <button className={styles.iconButton} title="Configuración" aria-label="Configuración">
            <IconoSettings />
          </button>
        </Link>

        {newItemButton && (
          <Link href={newItemButton.href} className={styles.linkReset}>
            <button className={styles.primaryButton}>
              <span>+</span>
              {newItemButton.label}
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
