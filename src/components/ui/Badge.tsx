import { HTMLAttributes } from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "success" | "muted" | "warning";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

/**
 * Badge de estado (Activo/Archivado) — docs/design-system.md §6.6.
 * Siempre lleva texto, nunca solo color (regla de accesibilidad §4.1).
 */
export function Badge({ variant, children, className, ...props }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(" ")} {...props}>
      {children}
    </span>
  );
}
