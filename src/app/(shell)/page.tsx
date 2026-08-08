"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { buscarPacientes } from "@/application/use-cases/buscarPacientes";
import { PacienteRepositoryDexie } from "@/infrastructure/db/dexie/PacienteRepositoryDexie";
import { InsumoRepositoryDexie } from "@/infrastructure/db/dexie/InsumoRepositoryDexie";
import { obtenerCitasPorMes } from "@/infrastructure/db/dexie/estadisticas";
import { ResultadoBusquedaPacientes } from "@/domain/repositories/IPacienteRepository";
import { Button } from "@/components/ui/Button";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Alert } from "@/components/ui/Alert";
import { IconoAlerta } from "@/components/insumos/iconos";
import { GraficoConsultasPorMes } from "@/components/inicio/GraficoConsultasPorMes";
import styles from "./inicio.module.css";

const repo = new PacienteRepositoryDexie();
const insumoRepo = new InsumoRepositoryDexie();
const ANIO_ACTUAL = new Date().getFullYear();

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

function IconoReloj() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

interface TarjetaMetricaProps {
  titulo: string;
  valor: React.ReactNode;
  icono: React.ReactNode;
  color?: "primary" | "secondary" | "tertiary";
  alerta?: boolean;
  testId?: string;
  children?: React.ReactNode;
}

/**
 * Tarjeta de métrica del Inicio (US1: FR-001 a FR-003; US3: FR-009, FR-010; rediseño
 * posterior) — mismo lenguaje visual (ícono en caja de color + título + valor) que las
 * tarjetas de Pacientes/Insumos, pero admite contenido extra debajo (CTA, descripción),
 * a diferencia de esas dos pantallas donde la tarjeta es solo el número.
 */
function TarjetaMetrica({
  titulo,
  valor,
  icono,
  color = "primary",
  alerta = false,
  testId,
  children,
}: TarjetaMetricaProps) {
  const colorMap = {
    primary: "rgba(0, 100, 124, 0.1)",
    secondary: "rgba(0, 103, 129, 0.1)",
    tertiary: "rgba(29, 99, 122, 0.1)",
  };

  return (
    <div className={styles.tarjeta}>
      <div className={styles.tarjetaEncabezado}>
        <div className={styles.tarjetaContenido}>
          <p className={styles.tarjetaTitulo}>{titulo}</p>
          <p
            className={`${styles.tarjetaValor} ${alerta ? styles.tarjetaValorAlerta : ""}`}
            data-testid={testId}
          >
            {valor}
          </p>
        </div>
        <div
          className={`${styles.tarjetaIcono} ${alerta ? styles.tarjetaIconoAlerta : ""}`}
          style={{ backgroundColor: alerta ? "var(--color-warning-bg)" : colorMap[color] }}
        >
          {icono}
        </div>
      </div>
      {children && <div className={styles.tarjetaCuerpo}>{children}</div>}
    </div>
  );
}

/**
 * Inicio del sistema (US1: FR-001 a FR-003; US3: FR-009, FR-010). El total de pacientes
 * activos y la búsqueda reutilizan buscarPacientes/Dexie y la pantalla de Pacientes ya
 * existentes — sin nuevo método de repositorio ni resultados inline (research.md #3, #5).
 */
export default function InicioPage() {
  const { data: sesion } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  // Este límite es 1 y no se usa `pacientes` porque la pantalla de Inicio solo necesita el
  // conteo (`total`) — research.md #11 no aplica acá, la paginación real vive en /pacientes.
  const resultado = useLiveQuery<ResultadoBusquedaPacientes | undefined>(
    () => buscarPacientes(repo, { estado: "ACTIVO", limite: 1 }),
    [],
  );
  const totalActivos = resultado?.total;

  // FR-006 (010-gestion-insumos): conteo de insumos a reponer, calculado localmente contra
  // Dexie — sin una consulta de red adicional (research.md #4, #7).
  const insumosAReponer = useLiveQuery(() => insumoRepo.contarAReponer(), []);

  // Evolución mes a mes de las consultas en el año — agregado local de estadisticas.ts
  // (rediseño posterior), sin puerto de dominio nuevo.
  const consultasPorMes = useLiveQuery(() => obtenerCitasPorMes(ANIO_ACTUAL), []);

  function onBuscar() {
    const texto = q.trim();
    if (!texto) {
      setErrorBusqueda("Ingresa al menos un criterio de búsqueda (nombre o documento).");
      return;
    }
    setErrorBusqueda(null);
    router.push(`/pacientes?q=${encodeURIComponent(texto)}`);
  }

  return (
    <>
      <TopAppBar
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Buscar por nombre o documento..."
        searchAriaLabel="Buscar por nombre o documento"
        onSearchSubmit={onBuscar}
      />
      <main className={styles.main}>
        <h1 className={`text-heading-lg ${styles.saludo}`}>
          {sesion?.user?.nombre ? `Hola, ${sesion.user.nombre}` : "Hola"}
        </h1>

        {errorBusqueda && (
          <div className={styles.errorBusqueda}>
            <Alert variant="error">{errorBusqueda}</Alert>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.columnaIzquierda}>
            <TarjetaMetrica
              titulo="Pacientes activos"
              valor={totalActivos ?? "Cargando…"}
              icono={<IconoGrupo />}
              color="primary"
              testId="total-pacientes-activos"
            >
              {totalActivos === 0 && (
                <>
                  <p className="text-body-sm">Todavía no tenés pacientes cargados.</p>
                  <Link href="/pacientes/nuevo">
                    <Button style={{ marginTop: "var(--space-2)" }}>Crear tu primer paciente</Button>
                  </Link>
                </>
              )}
            </TarjetaMetrica>

            <TarjetaMetrica
              titulo="Insumos a reponer"
              valor={insumosAReponer ?? "Cargando…"}
              icono={<IconoAlerta />}
              color="secondary"
              alerta={Boolean(insumosAReponer && insumosAReponer > 0)}
              testId="total-insumos-a-reponer"
            />

            <div className={`${styles.tarjeta} ${styles.tarjetaProximamente}`}>
              <span className={styles.cintaProximamente} aria-hidden="true">
                Próximamente
              </span>
              <div className={styles.tarjetaIcono}>
                <IconoReloj />
              </div>
              <p className={styles.tarjetaTitulo}>Próximas citas</p>
              <p className="text-body-sm" style={{ color: "var(--color-muted-foreground)" }}>
                Muy pronto vas a poder agendar citas con fecha y hora, y ver acá las próximas
                de la semana.
              </p>
            </div>
          </div>

          <div className={`${styles.tarjeta} ${styles.tarjetaGrafico}`}>
            <p className={styles.tarjetaTitulo}>Consultas por mes</p>
            <div className={styles.graficoContenedor}>
              {consultasPorMes === undefined ? (
                <p className="text-body-sm">Cargando…</p>
              ) : (
                <GraficoConsultasPorMes datos={consultasPorMes} />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
