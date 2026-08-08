import { HTMLAttributes } from "react";
import styles from "./Alert.module.css";

type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant: AlertVariant;
  title?: string;
}

/** Alert reutilizable — docs/design-system.md §6.7. */
export function Alert({ variant, title, children, className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={[styles.alert, styles[variant], className].filter(Boolean).join(" ")}
      {...props}
    >
      {title && <p className={`${styles.title} text-body-sm`}>{title}</p>}
      <div className="text-body-sm">{children}</div>
    </div>
  );
}
