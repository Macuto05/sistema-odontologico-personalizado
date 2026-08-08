"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { buscarInsumos } from "@/application/use-cases/buscarInsumos";
import { InsumoRepositoryDexie } from "@/infrastructure/db/dexie/InsumoRepositoryDexie";
import { ResultadoBusquedaInsumos } from "@/domain/repositories/IInsumoRepository";
import { Insumo, estaAReponer } from "@/domain/entities/Insumo";
import { db } from "@/infrastructure/db/dexie/db";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { IconoAlerta, IconoInventario } from "@/components/insumos/iconos";
import styles from "./insumos.module.css";

const repo = new InsumoRepositoryDexie();
const TAMANO_PAGINA = 10;

type EstadoTab = "ACTIVO" | "ARCHIVADO";

function numerosDePagina(pagina: number, totalPaginas: number): number[] {
  const MAX = 5;
  if (totalPaginas <= MAX) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  let inicio = Math.max(1, pagina - Math.floor(MAX / 2));
  const fin = Math.min(totalPaginas, inicio + MAX - 1);
  inicio = Math.max(1, fin - MAX + 1);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function MetricaCard({
  titulo,
  valor,
  icono,
  color = "primary",
  alerta = false,
}: {
  titulo: string;
  valor: string | number;
  icono: React.ReactNode;
  color?: "primary" | "secondary" | "tertiary";
  /** Tiñe el valor y el ícono con el token de advertencia (FR-006). */
  alerta?: boolean;
}) {
  const colorMap = {
    primary: "rgba(0, 100, 124, 0.1)",
    secondary: "rgba(0, 103, 129, 0.1)",
    tertiary: "rgba(29, 99, 122, 0.1)",
  };

  return (
    <div className={styles.metricaCard}>
      <div className={styles.metricaContenido}>
        <p className={styles.metricaTitulo}>{titulo}</p>
        <p className={`${styles.metricaValor} ${alerta ? styles.metricaValorAlerta : ""}`}>
          {valor}
        </p>
      </div>
      <div
        className={`${styles.metricaIcono} ${alerta ? styles.metricaIconoAlerta : ""}`}
        style={{ backgroundColor: alerta ? "var(--color-warning-bg)" : colorMap[color] }}
      >
        {icono}
      </div>
    </div>
  );
}

/**
 * Listado + búsqueda de insumos (US1 a US5) — réplica del listado de Pacientes: paginado en
 * lotes de 10 (FR-007), pestañas Activos/Archivados (FR-010) y las mismas métricas arriba.
 * Lo propio de esta pantalla es el resaltado de los insumos a reponer (FR-005).
 */
function InsumosPageContent() {
  const searchParams = useSearchParams();
  const qInicial = searchParams.get("q") ?? "";
  const estadoInicial = searchParams.get("estado") === "ARCHIVADO" ? "ARCHIVADO" : "ACTIVO";
  // Permite entrar directo al listado ya filtrado desde la tarjeta de Inicio (FR-006).
  const aReponerInicial = searchParams.get("aReponer") === "true";

  const [q, setQ] = useState(qInicial);
  const [qDebounced, setQDebounced] = useState(qInicial);
  const [estado, setEstado] = useState<EstadoTab>(estadoInicial);
  const [pagina, setPagina] = useState(1);

  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [soloAReponer, setSoloAReponer] = useState(aReponerInicial);
  const categorias = useLiveQuery(() => repo.listarCategorias(), []) ?? [];
  const hayFiltrosActivos = Boolean(categoriaFiltro) || soloAReponer;

  useEffect(() => {
    const timeout = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    setPagina(1);
  }, [qDebounced, estado, categoriaFiltro, soloAReponer]);

  const resultado = useLiveQuery<ResultadoBusquedaInsumos | undefined>(
    () =>
      buscarInsumos(repo, {
        q: qDebounced || undefined,
        categoria: categoriaFiltro || undefined,
        aReponer: soloAReponer || undefined,
        estado,
        pagina,
        limite: TAMANO_PAGINA,
      }),
    [qDebounced, categoriaFiltro, soloAReponer, estado, pagina],
  );

  const totalInsumos = useLiveQuery(() => db.insumos.count(), []);
  const totalAReponer = useLiveQuery(() => repo.contarAReponer(), []);

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / TAMANO_PAGINA)) : 1;
  const desde = resultado && resultado.total > 0 ? (pagina - 1) * TAMANO_PAGINA + 1 : 0;
  const hasta = resultado ? Math.min(pagina * TAMANO_PAGINA, resultado.total) : 0;

  return (
    <>
      <TopAppBar
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Buscar insumo..."
        searchAriaLabel="Buscar por nombre"
        newItemButton={{
          label: "Nuevo insumo",
          href: "/insumos/nuevo",
        }}
      />

      <main className={styles.main}>
        <div className={styles.headerSeccion}>
          <div>
            <h1 className={styles.titulo}>
              {estado === "ACTIVO" ? "Insumos Activos" : "Insumos Archivados"}
            </h1>
            <p className={styles.subtitulo}>Control de stock de materiales del consultorio.</p>
          </div>

          <div className={styles.controles}>
            <Tabs
              variante="switch"
              opciones={[
                { valor: "ACTIVO", etiqueta: "Activos" },
                { valor: "ARCHIVADO", etiqueta: "Archivados" },
              ]}
              valorActivo={estado}
              onCambiar={setEstado}
            />
          </div>
        </div>

        <div className={styles.metricasGrid}>
          <MetricaCard
            titulo="Total Insumos"
            valor={totalInsumos ?? "—"}
            icono={<IconoInventario />}
            color="primary"
          />
          <MetricaCard
            titulo="A Reponer"
            valor={totalAReponer ?? "—"}
            icono={<IconoAlerta />}
            color="secondary"
            alerta={Boolean(totalAReponer && totalAReponer > 0)}
          />
          <div className={`${styles.metricaCard} ${styles.filtrosTarjeta}`}>
            <div className={styles.filtrosTarjetaEncabezado}>
              <span className={styles.metricaTitulo}>Filtros</span>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  className={styles.filtrosLimpiar}
                  onClick={() => {
                    setCategoriaFiltro("");
                    setSoloAReponer(false);
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className={styles.filtrosFila}>
              <div className={styles.filtrosCampoCategoria}>
                <Select
                  aria-label="Categoría"
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <Checkbox
                label="Solo a reponer"
                checked={soloAReponer}
                onChange={(e) => setSoloAReponer(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {resultado === undefined && <p className="text-body-sm">Cargando…</p>}

        {resultado && resultado.total === 0 && (
          <Alert variant="info">No se encontraron insumos con ese criterio de búsqueda.</Alert>
        )}

        {resultado && resultado.total > 0 && (
          <>
            <div className={styles.tablaContenedor}>
              <div className={styles.tablaScroll}>
                <table className={styles.tabla}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Stock actual</th>
                      <th>Stock mínimo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.insumos.map((i) => (
                      <FilaInsumo key={i.id} insumo={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.piePaginacion}>
              <p className={styles.infoMostrando}>
                Mostrando {desde} a {hasta} de {resultado.total} insumos
              </p>
              <div className={styles.controlesPaginacion}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  ‹
                </Button>
                {numerosDePagina(pagina, totalPaginas).map((n) => (
                  <Button
                    key={n}
                    variant={n === pagina ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPagina(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

/**
 * FR-005: la fila se resalta cuando el stock actual está en o por debajo del mínimo. El
 * color nunca va solo — la columna Estado siempre lleva el texto "A reponer"/"En stock"
 * (regla de accesibilidad §4.1 del design system).
 */
function FilaInsumo({ insumo }: { insumo: Insumo }) {
  const aReponer = estaAReponer(insumo);

  return (
    <tr className={aReponer ? styles.filaAReponer : undefined}>
      <td data-columna="Nombre">
        <Link href={`/insumos/${insumo.id}`} className={styles.filaInsumo}>
          <span className={styles.nombreInsumo}>{insumo.nombre}</span>
        </Link>
      </td>
      <td data-columna="Categoría">
        {insumo.categoria ?? <span className={styles.sinCategoria}>Sin categoría</span>}
      </td>
      <td data-columna="Stock actual">
        <span className={aReponer ? styles.stockAlerta : undefined}>{insumo.stockActual}</span>
      </td>
      <td data-columna="Stock mínimo">{insumo.stockMinimo}</td>
      <td data-columna="Estado">
        {insumo.estado === "ARCHIVADO" ? (
          <Badge variant="muted">Archivado</Badge>
        ) : aReponer ? (
          <Badge variant="warning">A reponer</Badge>
        ) : (
          <Badge variant="success">En stock</Badge>
        )}
      </td>
    </tr>
  );
}

export default function InsumosPage() {
  return (
    <Suspense>
      <InsumosPageContent />
    </Suspense>
  );
}
