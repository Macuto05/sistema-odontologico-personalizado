"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { buscarPacientes } from "@/application/use-cases/buscarPacientes";
import { SIN_CONSULTORIO_FILTRO } from "@/application/dto/pacienteDto";
import { PacienteRepositoryDexie } from "@/infrastructure/db/dexie/PacienteRepositoryDexie";
import { ConsultorioRepositoryDexie } from "@/infrastructure/db/dexie/ConsultorioRepositoryDexie";
import { contarPacientesNuevosEnMes } from "@/infrastructure/db/dexie/estadisticas";
import { ResultadoBusquedaPacientes } from "@/domain/repositories/IPacienteRepository";
import { db } from "@/infrastructure/db/dexie/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { calcularEdad, formatearFecha } from "@/components/pacientes/formatearFecha";
import { formatearDocumentoIdentidad } from "@/components/ui/documentoIdentidad";
import styles from "./pacientes.module.css";

const repo = new PacienteRepositoryDexie();
const consultorioRepo = new ConsultorioRepositoryDexie();
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

function IconoGrupo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconoTendencia() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function MetricaCard({
  titulo,
  valor,
  icono,
  color = "primary",
}: {
  titulo: string;
  valor: string | number;
  icono: React.ReactNode;
  color?: "primary" | "secondary" | "tertiary";
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
        <p className={styles.metricaValor}>{valor}</p>
      </div>
      <div
        className={styles.metricaIcono}
        style={{ backgroundColor: colorMap[color] }}
      >
        {icono}
      </div>
    </div>
  );
}

/**
 * Listado + búsqueda de pacientes (US2, FR-005, FR-006), paginado en lotes de 10
 * (research.md #11) y con pestañas Activos/Archivados en vez de una ruta separada
 * (decisión del rediseño, `tasks.md` Fase 8).
 */
function PacientesPageContent() {
  const searchParams = useSearchParams();
  const qInicial = searchParams.get("q") ?? "";
  const estadoInicial = searchParams.get("estado") === "ARCHIVADO" ? "ARCHIVADO" : "ACTIVO";
  const [q, setQ] = useState(qInicial);
  const [qDebounced, setQDebounced] = useState(qInicial);
  const [estado, setEstado] = useState<EstadoTab>(estadoInicial);
  const [pagina, setPagina] = useState(1);

  // Filtro de edad libre + consultorio único (007-representante-menor). "" es "todos los
  // consultorios"; SIN_CONSULTORIO_FILTRO es el sentinel que buscarPacientesQuerySchema
  // traduce a `null` ("sin consultorio asignado"). Siempre visibles en la 3ra tarjeta de
  // métricas, sin popover (rediseño posterior).
  const [edadMinInput, setEdadMinInput] = useState("");
  const [edadMaxInput, setEdadMaxInput] = useState("");
  const [edadMinDebounced, setEdadMinDebounced] = useState("");
  const [edadMaxDebounced, setEdadMaxDebounced] = useState("");
  const [consultorioFiltro, setConsultorioFiltro] = useState("");
  const consultorios = useLiveQuery(() => consultorioRepo.listar(), []) ?? [];
  const hayFiltrosActivos = Boolean(edadMinInput || edadMaxInput || consultorioFiltro);

  useEffect(() => {
    const timeout = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setEdadMinDebounced(edadMinInput);
      setEdadMaxDebounced(edadMaxInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [edadMinInput, edadMaxInput]);

  useEffect(() => {
    setPagina(1);
  }, [qDebounced, estado, edadMinDebounced, edadMaxDebounced, consultorioFiltro]);

  const resultado = useLiveQuery<ResultadoBusquedaPacientes | undefined>(
    () =>
      buscarPacientes(repo, {
        q: qDebounced || undefined,
        estado,
        pagina,
        limite: TAMANO_PAGINA,
        edadMin: edadMinDebounced ? Number(edadMinDebounced) : undefined,
        edadMax: edadMaxDebounced ? Number(edadMaxDebounced) : undefined,
        consultorioId: consultorioFiltro || undefined,
      }),
    [qDebounced, estado, pagina, edadMinDebounced, edadMaxDebounced, consultorioFiltro],
  );

  // Métricas: total de pacientes en el sistema y nuevos ingresados en el mes calendario
  // actual (estadisticas.ts, agregado local sin puerto de dominio — research.md del
  // rediseño de tarjetas).
  const totalPacientes = useLiveQuery(() => db.pacientes.count(), []);
  const nuevosEnMes = useLiveQuery(() => contarPacientesNuevosEnMes(), []);

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / TAMANO_PAGINA)) : 1;
  const desde = resultado && resultado.total > 0 ? (pagina - 1) * TAMANO_PAGINA + 1 : 0;
  const hasta = resultado ? Math.min(pagina * TAMANO_PAGINA, resultado.total) : 0;

  return (
    <>
      <TopAppBar
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Buscar paciente..."
        searchAriaLabel="Buscar por nombre o documento"
        newItemButton={{
          label: "Nuevo paciente",
          href: "/pacientes/nuevo",
        }}
      />

      <main className={styles.main}>
        <div className={styles.headerSeccion}>
          <div>
            <h1 className={styles.titulo}>Pacientes Activos</h1>
            <p className={styles.subtitulo}>Gestión y seguimiento de historial clínico.</p>
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

        {/* Métricas */}
        <div className={styles.metricasGrid}>
          <MetricaCard
            titulo="Total Pacientes"
            valor={totalPacientes ?? "—"}
            icono={<IconoGrupo />}
            color="primary"
          />
          <MetricaCard
            titulo="Nuevos (Mes)"
            valor={nuevosEnMes ?? "—"}
            icono={<IconoTendencia />}
            color="tertiary"
          />
          <div className={`${styles.metricaCard} ${styles.filtrosTarjeta}`}>
            <div className={styles.filtrosTarjetaEncabezado}>
              <span className={styles.metricaTitulo}>Filtros</span>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  className={styles.filtrosLimpiar}
                  onClick={() => {
                    setEdadMinInput("");
                    setEdadMaxInput("");
                    setConsultorioFiltro("");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className={styles.filtrosFila}>
              <div className={styles.filtrosRangoEdad}>
                <Input
                  type="number"
                  min={0}
                  placeholder="Mín."
                  aria-label="Edad mínima"
                  value={edadMinInput}
                  onChange={(e) => setEdadMinInput(e.target.value)}
                />
                <span aria-hidden="true">–</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Máx."
                  aria-label="Edad máxima"
                  value={edadMaxInput}
                  onChange={(e) => setEdadMaxInput(e.target.value)}
                />
              </div>
              <div className={styles.filtrosCampoConsultorio}>
                <Select
                  aria-label="Consultorio"
                  value={consultorioFiltro}
                  onChange={(e) => setConsultorioFiltro(e.target.value)}
                >
                  <option value="">Todos los consultorios</option>
                  <option value={SIN_CONSULTORIO_FILTRO}>Sin consultorio</option>
                  {consultorios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {resultado === undefined && <p className="text-body-sm">Cargando…</p>}

        {resultado && resultado.total === 0 && (
          <Alert variant="info">No se encontraron pacientes con ese criterio de búsqueda.</Alert>
        )}

        {resultado && resultado.total > 0 && (
          <>
            <div className={styles.tablaContenedor}>
              <div className={styles.tablaScroll}>
                <table className={styles.tabla}>
                  <thead>
                    <tr>
                      <th>Nombre completo</th>
                      <th>Documento</th>
                      <th>Edad</th>
                      <th>Teléfono</th>
                      <th>Consultorio</th>
                      <th>Última visita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.pacientes.map((p) => (
                      <FilaPaciente key={p.id} paciente={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.piePaginacion}>
              <p className={styles.infoMostrando}>
                Mostrando {desde} a {hasta} de {resultado.total} pacientes
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

interface PacienteRow {
  id: string;
  nombreCompleto: string;
  email: string | null;
  documentoIdentidad: string | null;
  fechaNacimiento: string;
  telefono: string | null;
  consultorioId: string | null;
}

function FilaPaciente({ paciente: p }: { paciente: PacienteRow }) {
  const ultimaVisita = useLiveQuery(
    () =>
      db.citas
        .where("[pacienteId+estado]")
        .equals([p.id, "FINALIZADA"])
        .toArray()
        .then((citas) => {
          if (citas.length === 0) return null;
          const masReciente = citas.reduce((a, b) =>
            (b.finalizadaEn ?? b.createdAt) > (a.finalizadaEn ?? a.createdAt) ? b : a,
          );
          return masReciente.finalizadaEn ?? masReciente.createdAt;
        }),
    [p.id],
  );

  const consultorios = useLiveQuery(() => consultorioRepo.listar(), []);
  const nombreDeConsultorio = useMemo(
    () => new Map((consultorios ?? []).map((c) => [c.id, c.nombre])),
    [consultorios],
  );

  const edad = calcularEdad(p.fechaNacimiento);

  return (
    <tr>
      <td>
        <Link href={`/pacientes/${p.id}`} className={styles.filaPaciente}>
          <Avatar nombre={p.nombreCompleto} />
          <span className={styles.nombrePaciente}>{p.nombreCompleto}</span>
        </Link>
      </td>
      <td>{formatearDocumentoIdentidad(p.documentoIdentidad)}</td>
      <td>{edad} años</td>
      <td>{p.telefono ?? "—"}</td>
      <td>{p.consultorioId ? (nombreDeConsultorio.get(p.consultorioId) ?? "Sin consultorio") : "Sin consultorio"}</td>
      <td>
        {ultimaVisita ? formatearFecha(ultimaVisita.slice(0, 10)) : "—"}
      </td>
    </tr>
  );
}

export default function PacientesPage() {
  return (
    <Suspense>
      <PacientesPageContent />
    </Suspense>
  );
}

/** Fecha (sin hora) de la cita finalizada más reciente del paciente — "—" si nunca tuvo
 * ninguna. Una consulta chica por fila (10 como mucho por página), reactiva vía Dexie. */
