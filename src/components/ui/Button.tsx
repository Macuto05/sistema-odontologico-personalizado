import { ButtonHTMLAttributes, forwardRef } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "outline" | "destructive";
type ButtonSize = "sm" | "default" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Botón reutilizable — docs/design-system.md §6.1. Buscar acá antes de crear uno nuevo. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "default", className, ...props },
  ref,
) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");
  // suppressHydrationWarning: algunas extensiones del navegador (autocompletado de
  // formularios) inyectan atributos como fdprocessedid en botones/inputs antes de que
  // React hidrate, lo que dispara un falso positivo de mismatch — no es un bug de la app.
  return <button ref={ref} className={classes} suppressHydrationWarning {...props} />;
});
