import { HTMLAttributes } from "react";
import styles from "./Card.module.css";

/** Card reutilizable — docs/design-system.md §6.3. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.card, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.header, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.content, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.footer, className].filter(Boolean).join(" ")} {...props} />;
}
