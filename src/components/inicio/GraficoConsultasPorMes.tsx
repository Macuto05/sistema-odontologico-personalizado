import styles from "./GraficoConsultasPorMes.module.css";

const MESES_ABREV = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

interface GraficoConsultasPorMesProps {
  /** Índice 0 = Enero. Un valor por mes, del año en curso hasta el mes actual. */
  datos: number[];
}

/** Gráfico de barras propio (sin librería) — un valor por mes, para comparar de un vistazo
 * cuántas consultas se registraron mes a mes. Una sola serie: sin leyenda (el título de la
 * tarjeta ya dice qué se grafica), valor directo sobre cada barra en vez de ejes numéricos. */
export function GraficoConsultasPorMes({ datos }: GraficoConsultasPorMesProps) {
  const total = datos.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
        Todavía no hay consultas registradas este año.
      </p>
    );
  }

  const max = Math.max(...datos, 1);
  const etiqueta = datos
    .map((valor, i) => `${MESES_ABREV[i]}: ${valor} consulta${valor === 1 ? "" : "s"}`)
    .join(", ");

  return (
    <div className={styles.graficoWrap}>
      <div className={styles.grafico} role="img" aria-label={`Consultas por mes — ${etiqueta}`}>
        {datos.map((valor, i) => {
          const alturaPct = Math.max((valor / max) * 100, valor > 0 ? 4 : 0);
          return (
            <div
              key={i}
              className={styles.graficoColumna}
              tabIndex={0}
              title={`${MESES_ABREV[i]}: ${valor} consulta${valor === 1 ? "" : "s"}`}
            >
              <div className={styles.graficoBarra} style={{ height: `${alturaPct}%` }}>
                <span className={styles.graficoValor}>{valor}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.graficoEjeMeses} aria-hidden="true">
        {datos.map((_, i) => (
          <span key={i} className={styles.graficoMes}>
            {MESES_ABREV[i]}
          </span>
        ))}
      </div>
    </div>
  );
}
