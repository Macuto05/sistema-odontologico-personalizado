"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import styles from "./Sidebar.module.css";

type IconProps = { className?: string };

function IconInicio({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconPacientes({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconInsumos({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}

function IconCerrarSesion({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function IconChevron({ className, direccion }: IconProps & { direccion: "izquierda" | "derecha" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direccion === "izquierda" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "Inicio", Icon: IconInicio },
  { href: "/pacientes", label: "Pacientes", Icon: IconPacientes },
  { href: "/insumos", label: "Insumos", Icon: IconInsumos },
];

interface SidebarProps {
  /** Estado final ya combinado (forzado por ruta || preferencia manual) — decide la clase CSS. */
  colapsada: boolean;
  /** Se oculta el botón de toggle cuando el colapso está forzado por ruta (`/citas/[id]`):
   * togglearlo ahí no cambiaría nada visible, sería un botón confuso. */
  mostrarToggle: boolean;
  /** Preferencia manual guardada — decide para qué lado apunta la flecha del botón. */
  colapsadaManual: boolean;
  onToggle: () => void;
}

/**
 * Sidebar de navegación — docs/design-system.md §6.8, FR-004 a FR-008. Resalta el ítem
 * activo según la ruta actual; la tarjeta de perfil lleva a Configuración; "Cerrar
 * sesión" termina la sesión desde cualquier pantalla. El colapso (forzado por ruta o
 * elegido por el usuario) se calcula en `layout.tsx` y llega acá por props — así el
 * `<div className={styles.content}>` que vive al lado puede compensar el mismo ancho sin
 * duplicar el estado en dos componentes separados.
 */
export function Sidebar({ colapsada, mostrarToggle, colapsadaManual, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: sesion } = useSession();
  const nombre = sesion?.user?.nombre ?? "";
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <nav
      className={`${styles.sidebar} ${colapsada ? styles.colapsada : ""}`}
      aria-label="Navegación principal"
    >
      {mostrarToggle && (
        <div className={styles.toggleFila}>
          <button
            type="button"
            className={styles.toggleBoton}
            onClick={onToggle}
            aria-label={colapsadaManual ? "Expandir navegación" : "Colapsar navegación"}
            aria-pressed={colapsadaManual}
          >
            <IconChevron
              direccion={colapsadaManual ? "derecha" : "izquierda"}
              className={styles.toggleIcono}
            />
          </button>
        </div>
      )}

      <div className={styles.logo}>
        <Image
          src="/logo-diente.png"
          alt=""
          width={34}
          height={40}
          className={styles.logoIcon}
          priority
        />
        <span className={styles.logoText}>Dental System</span>
      </div>

      <ul className={styles.list}>
        {ITEMS.map(({ href, label, Icon }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={activo ? "page" : undefined}
                className={[styles.item, activo ? styles.active : ""].filter(Boolean).join(" ")}
              >
                <Icon className={styles.icon} />
                <span className={styles.label}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        {/* Ya no lleva a Configuración — esa acción vive en el ícono de engranaje del
           TopAppBar (docs/design-system.md §6.20). Este bloque queda como identificación
           de la cuenta activa, sin acción propia. */}
        <div className={styles.perfil}>
          <span className={styles.avatar}>{inicial}</span>
          <span className={styles.perfilTexto}>
            <span className={styles.perfilNombre}>{nombre || "Cuenta"}</span>
            <span className={styles.perfilRol}>Odontólogo/a</span>
          </span>
        </div>
        <button
          type="button"
          aria-label="Cerrar sesión"
          className={`${styles.item} ${styles.logout}`}
          onClick={() => signOut({ callbackUrl: "/login" })}
          // Algunas extensiones del navegador (autocompletado de formularios) inyectan
          // atributos como fdprocessedid antes de que React hidrate — falso positivo de
          // mismatch, no un bug de la app.
          suppressHydrationWarning
        >
          <IconCerrarSesion className={styles.icon} />
          <span className={styles.label}>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}
