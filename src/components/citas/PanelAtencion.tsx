"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoriaConsulta, EstudioItem, ItemReceta } from "@/domain/entities/Cita";
import { Paciente } from "@/domain/entities/Paciente";
import { CitaRepositoryDexie } from "@/infrastructure/db/dexie/CitaRepositoryDexie";
import { OdontogramaRepositoryDexie } from "@/infrastructure/db/dexie/OdontogramaRepositoryDexie";
import { CambioOdontogramaRepositoryDexie } from "@/infrastructure/db/dexie/CambioOdontogramaRepositoryDexie";
import { crearOAbrirCita } from "@/application/use-cases/crearOAbrirCita";
import { editarCita } from "@/application/use-cases/editarCita";
import { finalizarCita } from "@/application/use-cases/finalizarCita";
import { registrarCheckpointsOdontogramaPaciente } from "@/application/use-cases/registrarCheckpointsOdontogramaPaciente";
import { Tabs, TabOption } from "@/components/ui/Tabs";
import { Accordion, AccordionSeccion } from "@/components/ui/Accordion";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ListaEtiquetas, ColorListaEtiquetas } from "@/components/ui/ListaEtiquetas";
import { calcularEdad } from "@/components/pacientes/formatearFecha";
import { formatearDocumentoIdentidad } from "@/components/ui/documentoIdentidad";
import { ANTECEDENTE_PATOLOGICO_LABEL } from "@/components/pacientes/antecedentesPatologicosOpciones";
import { OdontogramaTab } from "@/components/odontograma/OdontogramaTab";
import { DiagnosticoTab, ValoresDiagnostico } from "./DiagnosticoTab";
import { RecetaTab } from "./RecetaTab";
import { EstudiosTab } from "./EstudiosTab";
import { AntecedentesPanel } from "./AntecedentesPanel";
import { HistorialDrawer } from "./HistorialDrawer";
import styles from "./PanelAtencion.module.css";

const citaRepo = new CitaRepositoryDexie();
const odontogramaRepo = new OdontogramaRepositoryDexie();
const cambioOdontogramaRepo = new CambioOdontogramaRepositoryDexie();

type TabAtencion = "diagnostico" | "receta" | "estudios" | "odontograma";

const TABS: TabOption<TabAtencion>[] = [
  { valor: "diagnostico", etiqueta: "Diagnóstico" },
  { valor: "receta", etiqueta: "Receta" },
  { valor: "estudios", etiqueta: "Estudios" },
  { valor: "odontograma", etiqueta: "Odontograma" },
];

interface PanelAtencionProps {
  /** Id generado en el cliente al abrir el panel — no existe ninguna Cita con este id
   * hasta que se presiona "Finalizar atención" (spec §Assumptions, revisión posterior). */
  citaId: string;
  paciente: Paciente;
}

/**
 * Panel de Atención (005-atencion-paciente) — Tabs centrales (Diagnóstico/Receta/Estudios/
 * Odontograma) + Antecedentes e Historial de citas anteriores agrupados en un panel fijo al
 * borde derecho que se abre desde una pestaña (revisión visual posterior: antes vivían en
 * una columna lateral fija de 320px siempre visible, que le quitaba ancho a todas las
 * pestañas — sobre todo a Odontograma, que necesitaba scroll horizontal para mostrar una
 * arcada completa; la sidebar de navegación de la app también se colapsa a solo íconos en
 * esta pantalla por el mismo motivo, ver `Sidebar.tsx`). Rediseño posterior
 * (008-rediseno-visual-sistema, dos rondas): primero pasó de `Drawer` de pantalla completa a
 * `Modal` centrado; la odontóloga pidió después que ni siquiera fuera un modal — necesita
 * dejarlo abierto mientras sigue editando el resto de la pantalla (Diagnóstico/Receta/
 * Estudios), algo que un `Modal` con overlay no permite. Por eso es un `<aside>` propio,
 * fijo, sin overlay que bloquee ni cierre solo — con sus dos secciones colapsadas por
 * defecto (antes "Antecedentes" arrancaba expandida, alargando innecesariamente el panel).
 * El encabezado propio de esta
 * pantalla (`.topbar`, fijo, breadcrumb "Atender Cita › [paciente]") reemplaza el
 * `VolverLink` + encabezado con avatar que existían antes — mismo criterio de "Sincronización
 * con elementos position:fixed" que ya usa `TopAppBar` (§6.20): la sidebar en esta ruta
 * siempre está forzada a colapsada, así que el offset es fijo en 64px. Diagnóstico, Receta y
 * Estudios son un borrador que vive solo en este componente: no se crea ni se guarda
 * ninguna Cita hasta presionar "Finalizar atención" (User Story 6), que crea la Cita y
 * guarda todo junto en una sola operación. Antecedentes y Odontograma (006-odontograma,
 * research.md #6) son la excepción — son datos del paciente, no del borrador de la Cita, y
 * se guardan de inmediato con su propia persistencia.
 */
export function PanelAtencion({ citaId, paciente }: PanelAtencionProps) {
  const router = useRouter();
  const [tabActivo, setTabActivo] = useState<TabAtencion>("diagnostico");
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const [diagnosticoValores, setDiagnosticoValores] = useState<ValoresDiagnostico>({
    motivoConsulta: "",
    diagnostico: "",
    categoria: "",
  });
  const [recetaItems, setRecetaItems] = useState<ItemReceta[]>([]);
  const [estudioItems, setEstudioItems] = useState<EstudioItem[]>([]);

  function onCambiarDiagnostico(patch: Partial<ValoresDiagnostico>) {
    setDiagnosticoValores((actual) => ({ ...actual, ...patch }));
  }

  async function onConfirmarFinalizar() {
    setFinalizando(true);
    try {
      const creada = await crearOAbrirCita(citaRepo, { id: citaId, pacienteId: paciente.id });
      const categoria: CategoriaConsulta | null =
        diagnosticoValores.categoria === "" ? null : diagnosticoValores.categoria;
      const { cita: editada } = await editarCita(citaRepo, creada.id, {
        categoria,
        motivoConsulta: diagnosticoValores.motivoConsulta,
        diagnostico: diagnosticoValores.diagnostico,
        recetaItems,
        estudioItems,
        baseVersion: creada.version,
      });
      await finalizarCita(citaRepo, editada.id, editada.version);
      // "Finalizar atención" cierra también la sesión de edición del Odontograma — si hubo
      // cambios reales, archiva en el historial cómo se veía antes de esta cita (mismo
      // criterio que "Listo" en la ficha del paciente, `pacientes/[id]/page.tsx`). Se
      // dispara acá porque este panel navega fuera de inmediato — el tab de Odontograma no
      // llega a desmontarse "a tiempo" para reaccionar por su cuenta.
      await registrarCheckpointsOdontogramaPaciente(
        { odontogramaRepo, cambioRepo: cambioOdontogramaRepo },
        paciente.id,
      );
      router.push(`/pacientes/${paciente.id}`);
    } finally {
      setFinalizando(false);
    }
  }

  const edad = calcularEdad(paciente.fechaNacimiento);
  const documento = formatearDocumentoIdentidad(paciente.documentoIdentidad);

  const seccionesLaterales: AccordionSeccion[] = [
    {
      id: "antecedentes",
      titulo: "Antecedentes",
      contenido: <AntecedentesPanel paciente={paciente} />,
    },
    {
      id: "historial",
      titulo: "Historial de citas anteriores",
      contenido: <HistorialDrawer pacienteId={paciente.id} citaActualId={citaId} />,
    },
  ];

  return (
    <>
      <header className={styles.topbar}>
        <nav className={styles.migas} aria-label="Ubicación actual">
          <Link href={`/pacientes/${paciente.id}`} className={styles.migaLink}>
            Atender Cita
          </Link>
          <IconoMigaSeparador />
          <span className={styles.migaActual}>{paciente.nombreCompleto}</span>
        </nav>
        <div className={styles.accionesTopbar}>
          <button type="button" className={styles.iconoTopbar} title="Tiempo transcurrido" aria-label="Tiempo transcurrido">
            <IconoReloj />
          </button>
          <button type="button" className={styles.iconoTopbar} title="Más opciones" aria-label="Más opciones">
            <IconoTresPuntos />
          </button>
          <Button onClick={() => setConfirmandoFinalizar(true)}>Finalizar atención</Button>
        </div>
      </header>

      <div className={`${styles.pagina} ${historialAbierto ? styles.paginaConPanel : ""}`}>
        <div className={styles.hero}>
          <Avatar nombre={paciente.nombreCompleto} tamano="lg" />
          <div className={styles.heroIdentidad}>
            <h1 className="text-heading-lg">{paciente.nombreCompleto}</h1>
            <p className={`text-body-sm ${styles.subtitulo}`}>
              {edad} años · {documento}
            </p>
          </div>
          {/* Resumen de un vistazo — mismos datos que la sección Antecedentes del modal, sin
              tener que abrirlo. Solo lectura acá; se edita desde ahí (§6.2.1). */}
          <div className={styles.heroHistoriaClinica}>
            <FilaHistoriaClinica
              etiqueta="Ant. patológicos"
              etiquetas={[
                ...paciente.antecedentesPatologicos.map((a) => ANTECEDENTE_PATOLOGICO_LABEL[a]),
                ...paciente.antecedentesPatologicosOtros,
              ]}
              color="azul"
            />
            <FilaHistoriaClinica
              etiqueta="Ant. heredofamiliares"
              etiquetas={paciente.antecedentesHeredofamiliares}
              color="verde"
            />
            <FilaHistoriaClinica
              etiqueta="Medicamentos"
              etiquetas={paciente.medicamentosActuales}
              color="amarillo"
            />
            <FilaHistoriaClinica etiqueta="Alergias" etiquetas={paciente.alergias} color="rojo" />
          </div>
        </div>

        <div className={styles.principal}>
          <Tabs opciones={TABS} valorActivo={tabActivo} onCambiar={setTabActivo} />
          <div className={styles.contenidoTab} role="tabpanel">
            {tabActivo === "diagnostico" && (
              <DiagnosticoTab valores={diagnosticoValores} onChange={onCambiarDiagnostico} />
            )}
            {tabActivo === "receta" && <RecetaTab items={recetaItems} onChange={setRecetaItems} />}
            {tabActivo === "estudios" && (
              <EstudiosTab items={estudioItems} onChange={setEstudioItems} />
            )}
            {tabActivo === "odontograma" && <OdontogramaTab paciente={paciente} />}
          </div>
        </div>

        {!historialAbierto && (
          <button
            type="button"
            className={styles.pestanaLateral}
            onClick={() => setHistorialAbierto(true)}
            aria-label="Antecedentes e historial de citas"
          >
            <IconoHamburguesa />
            <span className={styles.pestanaLateralTexto}>Historial</span>
          </button>
        )}

        {/* Panel fijo, no modal: a pedido de la odontóloga debe poder quedar abierto
           mientras sigue editando Diagnóstico/Receta/Estudios en el resto de la pantalla —
           por eso no tiene overlay que oscurezca ni bloquee el resto (a diferencia de
           `Modal`), y solo se cierra con su propia "×" o el toggle, nunca solo. Empuja el
           contenido (como la sidebar izquierda) en vez de flotar encima — siempre montado
           (no condicional) para que el deslizamiento con `transform` se pueda animar; oculto
           del lado derecho vía `translateX` y `aria-hidden` cuando está cerrado. El carril
           recorta el panel cerrado: sin él, el panel corrido fuera de pantalla ensanchaba la
           página en celular (el teléfono la alejaba y dejaba arrastrarla de costado). */}
        <div className={styles.carrilHistorial}>
        <aside
          className={`${styles.panelHistorial} ${historialAbierto ? styles.panelHistorialAbierto : ""}`}
          aria-label="Antecedentes e historial"
          aria-hidden={!historialAbierto}
        >
          <div className={styles.panelHistorialEncabezado}>
            <h2 className={styles.panelHistorialTitulo}>Antecedentes e historial</h2>
            <button
              type="button"
              className={styles.panelHistorialCerrar}
              onClick={() => setHistorialAbierto(false)}
              aria-label="Cerrar"
              tabIndex={historialAbierto ? 0 : -1}
            >
              <IconoCerrar />
            </button>
          </div>
          <div className={styles.panelHistorialContenido}>
            <Accordion secciones={seccionesLaterales} abiertosPorDefecto={[]} />
          </div>
        </aside>
        </div>

        <Modal
          abierto={confirmandoFinalizar}
          titulo="¿Finalizar esta atención?"
          onCerrar={() => setConfirmandoFinalizar(false)}
        >
          <p className="text-body">
            Se va a crear el registro de esta atención con el diagnóstico, la receta y los
            estudios cargados. Una vez finalizada queda de solo lectura — no se puede volver a
            editar (salvo seguir adjuntando archivos de resultado a los estudios).
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmandoFinalizar(false)}>
              Cancelar
            </Button>
            <Button onClick={onConfirmarFinalizar} disabled={finalizando}>
              {finalizando ? "Finalizando…" : "Finalizar atención"}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </>
  );
}

/** Una fila con nombre de categoría — sin esto las 4 filas de colores eran ambiguas de un
 * vistazo (¿ese amarillo es medicamento o alergia?). Oculta si no hay etiquetas, igual que
 * ListaEtiquetas sola. */
function FilaHistoriaClinica({
  etiqueta,
  etiquetas,
  color,
}: {
  etiqueta: string;
  etiquetas: string[];
  color: ColorListaEtiquetas;
}) {
  if (etiquetas.length === 0) return null;
  return (
    <div className={styles.filaHistoriaClinica}>
      <span className={styles.filaHistoriaClinicaLabel}>{etiqueta}</span>
      <ListaEtiquetas etiquetas={etiquetas} color={color} />
    </div>
  );
}

function IconoHamburguesa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function IconoCerrar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function IconoMigaSeparador() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoTresPuntos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}
