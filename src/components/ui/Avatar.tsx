import styles from "./Avatar.module.css";

interface AvatarProps {
  nombre: string;
  tamano?: "sm" | "default" | "lg";
}

const COLORES = ["cyan700", "cyan900", "teal700", "slate500", "slate700"] as const;

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const primeras = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return primeras.join("") || "?";
}

/** Hash simple y determinístico — mismo nombre siempre cae en el mismo color. */
function colorPara(nombre: string): (typeof COLORES)[number] {
  let hash = 0;
  for (const char of nombre) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return COLORES[hash % COLORES.length]!;
}

/**
 * Avatar reutilizable — docs/design-system.md §6.9. Color de fondo determinístico sobre
 * 5 tokens ya existentes (research.md #13 de 001-gestion-pacientes) — nunca colores nuevos.
 */
export function Avatar({ nombre, tamano = "default" }: AvatarProps) {
  return (
    <span
      className={`${styles.avatar} ${styles[tamano]} ${styles[colorPara(nombre)]}`}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}
