"use client";

import Link from "next/link";
import styles from "./VolverLink.module.css";

interface VolverLinkProps {
  href: string;
  texto?: string;
}

/** Link de "volver" reutilizable — docs/design-system.md §6.18. Reemplaza los usos
 * duplicados de `← Volver a X` que existían con estilos ligeramente distintos en cada
 * pantalla. */
export function VolverLink({ href, texto = "Volver" }: VolverLinkProps) {
  return (
    <Link href={href} className={`${styles.volver} text-body-sm`}>
      <IconoFlecha className={styles.flecha} />
      {texto}
    </Link>
  );
}

function IconoFlecha({ className }: { className?: string }) {
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
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
