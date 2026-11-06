"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/dexie/db";
import { OdontogramaRepositoryDexie } from "@/infrastructure/db/dexie/OdontogramaRepositoryDexie";
import { CambioOdontogramaRepositoryDexie } from "@/infrastructure/db/dexie/CambioOdontogramaRepositoryDexie";
import { ItemPlanTratamientoRepositoryDexie } from "@/infrastructure/db/dexie/ItemPlanTratamientoRepositoryDexie";
import { obtenerOCrearOdontograma } from "@/application/use-cases/obtenerOCrearOdontograma";
import { registrarHallazgo } from "@/application/use-cases/registrarHallazgo";
import { editarHallazgo } from "@/application/use-cases/editarHallazgo";
import { eliminarHallazgo } from "@/application/use-cases/eliminarHallazgo";
import { guardarNotaDental } from "@/application/use-cases/guardarNotaDental";
import { registrarCheckpointsOdontogramaPaciente } from "@/application/use-cases/registrarCheckpointsOdontogramaPaciente";
import { crearItemPlanTratamiento } from "@/application/use-cases/crearItemPlanTratamiento";
import { editarItemPlanTratamiento } from "@/application/use-cases/editarItemPlanTratamiento";
import { eliminarItemPlanTratamiento } from "@/application/use-cases/eliminarItemPlanTratamiento";
import { Denticion, HallazgoDental, NotaDental, Odontograma } from "@/domain/entities/Odontograma";
import { rebasarBorrador } from "@/domain/entities/fusionOdontograma";
import { traerOdontogramasDelPaciente } from "@/infrastructure/sync/syncEngine";
import { ItemPlanTratamiento } from "@/domain/entities/ItemPlanTratamiento";
import { Paciente, puedeEditarse } from "@/domain/entities/Paciente";
import {
  DIENTES_ADULTO_INFERIOR,
  DIENTES_ADULTO_SUPERIOR,
  DIENTES_NINO_INFERIOR,
  DIENTES_NINO_SUPERIOR,
  buscarCondicion,
  denticionDeDiente,
} from "@/domain/entities/CondicionOdontograma";
import { DiagramaBoca, FilaDiagrama, SeleccionDiente } from "./DiagramaBoca";
import { calcularEdad } from "@/components/pacientes/formatearFecha";
import { PanelHerramientas } from "./PanelHerramientas";
import { LeyendaOdontograma } from "./LeyendaOdontograma";
import { HistorialOdontogramaTab } from "./HistorialOdontogramaTab";
import { PlanTratamientoTabla } from "./PlanTratamientoTabla";
import { Button } from "@/components/ui/Button";
import { Tabs, TabOption } from "@/components/ui/Tabs";
import styles from "./OdontogramaTab.module.css";

const odontogramaRepo = new OdontogramaRepositoryDexie();
const cambioRepo = new CambioOdontogramaRepositoryDexie();
const itemPlanTratamientoRepo = new ItemPlanTratamientoRepositoryDexie();

const CARGANDO = "CARGANDO" as const;
const DENTICIONES: Denticion[] = ["ADULTO", "NINO"];

export type VistaOdontograma = "actual" | "historial";

interface OdontogramaTabProps {
  paciente: Paciente;
  /** Si se pasa, fuerza el modo (ignora si el paciente está archivado) — usado en la ficha
   * de paciente (§6.10.1) para alternar entre ver y editar con un botón explícito. Si se
   * omite, cae al comportamiento original: solo lectura únicamente si está archivado. */
  soloLectura?: boolean;
  /** Avisa a quien renderiza este tab qué vista (Actual/Historial) está activa — la ficha de
   * paciente lo usa para ocultar su botón externo "Editar"/"Listo" mientras se ve Historial,
   * donde editar no tiene sentido (es de solo lectura por diseño). */
  onVistaChange?: (vista: VistaOdontograma) => void;
  /** Contenido extra (el botón "Editar"/"Listo" de la ficha de paciente) renderizado en la
   * misma fila que las pestañas Actual/Historial, a la derecha — en vez de en una fila
   * aparte arriba (feedback directo: "ponelo dentro de la barra donde están las pestañas"). */
  accionesTab?: ReactNode;
}

interface PendienteMultiDiente {
  condicionId: string;
}

/** Borrador en memoria del odontograma — todo lo que el odontólogo va marcando durante una
 * sesión de edición vive acá, NO en la base de datos, hasta que aprieta "Guardar cambios"
 * (feedback directo de la odontóloga: se equivocó de página, refrescó sin guardar y todo
 * quedó persistido igual — no quiere eso). Se inicializa como copia de `Odontograma` cada
 * vez que cambia lo realmente guardado (carga inicial, o justo después de un "Guardar
 * cambios" exitoso). Uno por dentición (no uno solo) — cambiar de Adulto a Niño y volver no
 * debe perder un borrador sin guardar de la vista anterior. */
interface BorradorOdontograma {
  hallazgos: HallazgoDental[];
  notas: NotaDental[];
}

type BorradoresPorDenticion = Record<Denticion, BorradorOdontograma | null>;

// Etiqueta "Actual" (no "Odontograma actual"): el texto "Odontograma" como substring acá
// chocaría con los múltiples `getByRole("tab", { name: "Odontograma" })` de los tests e2e
// que navegan al tab "Odontograma" de la ficha/Panel de Atención — ese locator (substring,
// case-insensitive) matchearía ambos tabs a la vez una vez que este componente ya está
// montado, y rompería en modo estricto.
const TABS_VISTA: TabOption<VistaOdontograma>[] = [
  { valor: "actual", etiqueta: "Actual" },
  { valor: "historial", etiqueta: "Historial" },
];

interface SnapshotDeshacer {
  denticion: Denticion;
  hallazgos: HallazgoDental[];
  notas: NotaDental[];
  descripcion: string;
}

function borradorDesde(o: Odontograma): BorradorOdontograma {
  return { hallazgos: o.hallazgos, notas: o.notas };
}

const BORRADOR_VACIO: BorradorOdontograma = { hallazgos: [], notas: [] };

/** true si el borrador de una dentición difiere de lo último guardado — insensible al
 * orden en que se tocaron los campos, solo importa el contenido final. */
function borradorDifiereDeLoGuardado(
  borrador: BorradorOdontograma | null,
  guardado: Odontograma | undefined,
): boolean {
  if (!borrador || !guardado) return false;
  return (
    JSON.stringify(borrador.hallazgos) !== JSON.stringify(guardado.hallazgos) ||
    JSON.stringify(borrador.notas) !== JSON.stringify(guardado.notas)
  );
}

/**
 * Tab "Odontograma" (006-odontograma) — reemplaza el placeholder deshabilitado de
 * 005-atencion-paciente. Solo lectura si el paciente está archivado (FR-019).
 *
 * Persistencia diferida (revisión posterior, feedback directo de la odontóloga): a
 * diferencia de la primera versión (que guardaba cada clic de inmediato en la base local),
 * todo lo que se marca durante una sesión de edición vive en `borradores`/`borradorPlan`
 * (estado de React, no la base) hasta que el odontólogo aprieta "Guardar cambios" — recién
 * ahí se escribe en la base y aparece en el historial, para AMBAS denticiones y el plan de
 * tratamiento a la vez ("Guardar cambios" es una acción global de toda la sesión, no del
 * diente actualmente seleccionado). "Cancelar", refrescar la página, o salir de modo
 * edición sin guardar descartan el borrador sin tocar la base. Deshacer/Rehacer operan
 * sobre el borrador en memoria de la dentición activa (sin round-trip a la base) — mismo
 * alcance que ya tenían antes de este cambio (se reinician al cambiar de dentición).
 *
 * Flujo de selección: un clic en un diente/superficie lo selecciona (resaltado); la
 * condición se elige después en `PanelHerramientas`, ahí mismo también vive la nota libre
 * del contexto — no depende de tener un hallazgo, y no hace falta ningún modal ni segundo
 * clic.
 */
export function OdontogramaTab({
  paciente,
  soloLectura: soloLecturaForzado,
  onVistaChange,
  accionesTab,
}: OdontogramaTabProps) {
  const pacienteId = paciente.id;
  const soloLectura = soloLecturaForzado ?? !puedeEditarse(paciente);

  const [vista, setVista] = useState<VistaOdontograma>("actual");
  const [seleccion, setSeleccion] = useState<SeleccionDiente | null>(null);
  // Odontograma unificado (feedback de la odontóloga, con el odontograma clásico de
  // referencia): ya no hay pestañas Adulto/Niño — se ven ambas denticiones a la vez y la
  // dentición "activa" es la del diente seleccionado (los números FDI no se repiten entre
  // ambas). Siguen siendo dos Odontogramas separados en la base: cada acción va al que
  // corresponde, sin migración de datos.
  const denticion: Denticion = seleccion ? denticionDeDiente(seleccion.diente) : "ADULTO";
  // null = automático (según edad y si ya hay datos de niño); true/false = lo eligió la
  // odontóloga con el botón "Mostrar/Ocultar dientes de niño".
  const [mostrarNinoManual, setMostrarNinoManual] = useState<boolean | null>(null);
  const [pendienteMultiDiente, setPendienteMultiDiente] = useState<PendienteMultiDiente | null>(
    null,
  );
  const [errorMultiDiente, setErrorMultiDiente] = useState<string | null>(null);
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);
  const [pilaDeshacer, setPilaDeshacer] = useState<SnapshotDeshacer[]>([]);
  const [pilaRehacer, setPilaRehacer] = useState<SnapshotDeshacer[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [borradores, setBorradores] = useState<BorradoresPorDenticion>({ ADULTO: null, NINO: null });
  const [borradorPlan, setBorradorPlan] = useState<ItemPlanTratamiento[] | null>(null);
  // true en cuanto el plan de tratamiento se toca en el borrador — el plan no tiene pila de
  // deshacer/rehacer propia (nunca la tuvo), pero sí necesita avisar que hay algo pendiente
  // de guardar aunque el odontograma en sí no haya cambiado.
  const [planTuvoCambios, setPlanTuvoCambios] = useState(false);

  // research.md #10: crea el Odontograma vacío de forma transparente la primera vez que se
  // necesita, sin ninguna acción explícita del usuario. Ambas denticiones a la vez (no solo
  // la activa) — el borrador de la que no se está viendo también necesita su base real para
  // poder compararse y guardarse junto con la otra. No aplica si está archivado.
  //
  // Antes de crear, se trae del servidor lo que ya exista para este paciente (si hay
  // conexión, con timeout): sin esto, en un dispositivo donde el pull global todavía no trajo
  // el odontograma, se creaba un duplicado vacío con otro id — se veía el diagrama vacío en vez
  // de los hallazgos reales y la sincronización se trababa (ver `guardarOdontogramaRemoto`,
  // que de todos modos reconcilia un duplicado si llega a crearse offline). En solo lectura
  // no se crea nada, pero sí se trae del servidor para mostrar lo que haya.
  const [listoParaMostrar, setListoParaMostrar] = useState(false);
  useEffect(() => {
    let cancelado = false;
    setListoParaMostrar(false);
    void (async () => {
      await traerOdontogramasDelPaciente(pacienteId);
      if (cancelado) return;
      if (!soloLectura) {
        for (const d of DENTICIONES) {
          try {
            await obtenerOCrearOdontograma(odontogramaRepo, { id: uuid(), pacienteId, denticion: d });
          } catch (err) {
            console.error("[odontograma] no se pudo crear/abrir", d, err);
          }
        }
      }
      if (!cancelado) setListoParaMostrar(true);
    })();
    return () => {
      cancelado = true;
    };
  }, [pacienteId, soloLectura]);

  const resultadoAdulto = useLiveQuery(
    () => db.odontogramas.where("[pacienteId+denticion]").equals([pacienteId, "ADULTO"]).first(),
    [pacienteId],
    CARGANDO,
  );
  const resultadoNino = useLiveQuery(
    () => db.odontogramas.where("[pacienteId+denticion]").equals([pacienteId, "NINO"]).first(),
    [pacienteId],
    CARGANDO,
  );
  const odontogramaAdulto = resultadoAdulto === CARGANDO ? undefined : resultadoAdulto;
  const odontogramaNino = resultadoNino === CARGANDO ? undefined : resultadoNino;
  const odontogramasGuardados: Record<Denticion, Odontograma | undefined> = {
    ADULTO: odontogramaAdulto,
    NINO: odontogramaNino,
  };
  const cargando = resultadoAdulto === CARGANDO || resultadoNino === CARGANDO;

  const itemsPlanGuardados = useLiveQuery(async () => {
    const todos = await db.itemsPlanTratamiento.where("pacienteId").equals(pacienteId).toArray();
    return todos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [pacienteId]);

  // Sincroniza el borrador de cada dentición con lo realmente guardado — carga inicial o
  // justo después de un "Guardar cambios" exitoso (misma id, version nueva). Mientras se
  // está editando sin guardar, nada de esto se dispara: el borrador solo cambia por acción
  // del propio odontólogo. Efecto separado por dentición para no pisar el borrador de la
  // que no cambió cuando la otra sí se guarda.
  //
  // Si la base cambia mientras hay un borrador (sync del servidor, o reconciliación de un
  // duplicado que cambia el id), los cambios sin guardar se REAPLICAN encima de la base nueva
  // (`rebasarBorrador`) en vez de pisarse: antes se perdía en silencio lo marcado sin guardar.
  // Tras un "Guardar cambios" el borrador ya coincide con la base nueva y el rebase es neutro.
  const basesBorrador = useRef<BorradoresPorDenticion>({ ADULTO: null, NINO: null });
  function sincronizarBorrador(d: Denticion, guardado: Odontograma | undefined) {
    if (!guardado) return;
    const nuevaBase = borradorDesde(guardado);
    const baseAnterior = basesBorrador.current[d];
    basesBorrador.current = { ...basesBorrador.current, [d]: nuevaBase };
    setBorradores((actual) => {
      const borradorActual = actual[d];
      return {
        ...actual,
        [d]:
          borradorActual && baseAnterior
            ? rebasarBorrador(baseAnterior, borradorActual, nuevaBase)
            : nuevaBase,
      };
    });
  }

  useEffect(() => {
    sincronizarBorrador("ADULTO", odontogramaAdulto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odontogramaAdulto?.id, odontogramaAdulto?.version]);

  useEffect(() => {
    sincronizarBorrador("NINO", odontogramaNino);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odontogramaNino?.id, odontogramaNino?.version]);

  useEffect(() => {
    if (itemsPlanGuardados) setBorradorPlan(itemsPlanGuardados);
  }, [itemsPlanGuardados]);

  /** Descarta cualquier borrador sin guardar de ambas denticiones y del plan de tratamiento
   * — usado por "Cancelar" y por salir de modo edición sin guardar (mismo criterio: nada
   * persiste salvo "Guardar cambios"). */
  function descartarBorradores() {
    setBorradores({
      ADULTO: odontogramaAdulto ? borradorDesde(odontogramaAdulto) : null,
      NINO: odontogramaNino ? borradorDesde(odontogramaNino) : null,
    });
    if (itemsPlanGuardados) setBorradorPlan(itemsPlanGuardados);
    setPilaDeshacer([]);
    setPilaRehacer([]);
    setPlanTuvoCambios(false);
    setSeleccion(null);
    setPendienteMultiDiente(null);
    setErrorMultiDiente(null);
  }

  // Cambiar de paciente sí descarta todo — son borradores de otra persona.
  useEffect(() => {
    setSeleccion(null);
    setPendienteMultiDiente(null);
    setPilaDeshacer([]);
    setPilaRehacer([]);
    setPlanTuvoCambios(false);
  }, [pacienteId]);

  // Salir de modo edición sin guardar descarta el borrador — mismo criterio que "Cancelar"
  // (feedback directo de la odontóloga: nada se guarda hasta "Guardar cambios", ni siquiera
  // saliendo de edición por otro camino).
  useEffect(() => {
    if (soloLectura) descartarBorradores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloLectura]);

  // Un paciente sin odontograma de una dentición simplemente no tiene hallazgos en ella: en
  // solo lectura (ficha del paciente, sin "Editar") no se crea ninguno, así que antes el
  // borrador quedaba null para siempre y la pantalla se clavaba en "Cargando…" (reportado por
  // la odontóloga). Una vez resuelta la consulta local y el intento de traerlo del servidor,
  // esa dentición se muestra vacía.
  function borradorVisible(d: Denticion): BorradorOdontograma | null {
    return (
      borradores[d] ??
      (soloLectura && !cargando && !odontogramasGuardados[d] && listoParaMostrar
        ? BORRADOR_VACIO
        : null)
    );
  }
  const borradorAdulto = borradorVisible("ADULTO");
  const borradorNino = borradorVisible("NINO");
  // Borrador de la dentición del diente seleccionado — sobre el que actúan las acciones.
  const borrador = denticion === "ADULTO" ? borradorAdulto : borradorNino;
  const listoDiagrama = !cargando && borradorAdulto !== null && borradorNino !== null;

  // Filas de niño: visibles por defecto en menores de 13 años (dentición temporal o mixta) o
  // si ya hay algo marcado en dientes de niño; ocultas en adultos sin datos de niño, para no
  // llenar el diagrama de 20 dientes vacíos (decisión acordada con la odontóloga).
  const tieneDatosNino =
    (borradorNino?.hallazgos.length ?? 0) > 0 || (borradorNino?.notas.length ?? 0) > 0;
  const mostrarNino = mostrarNinoManual ?? (calcularEdad(paciente.fechaNacimiento) < 13 || tieneDatosNino);
  const filas: FilaDiagrama[] = [
    { dientes: DIENTES_ADULTO_SUPERIOR, inferior: false },
    ...(mostrarNino
      ? [
          { dientes: DIENTES_NINO_SUPERIOR, inferior: false },
          { dientes: DIENTES_NINO_INFERIOR, inferior: true },
        ]
      : []),
    { dientes: DIENTES_ADULTO_INFERIOR, inferior: !mostrarNino },
  ];

  function alternarDientesNino() {
    const nuevo = !mostrarNino;
    setMostrarNinoManual(nuevo);
    // Ocultar las filas de niño con un diente de niño seleccionado dejaría un panel apuntando
    // a algo que ya no se ve.
    if (!nuevo && seleccion && denticionDeDiente(seleccion.diente) === "NINO") {
      setSeleccion(null);
      setPendienteMultiDiente(null);
      setErrorMultiDiente(null);
    }
  }

  function hallazgosEnContexto(ctx: SeleccionDiente | null): HallazgoDental[] {
    if (!ctx || !borrador) return [];
    return borrador.hallazgos.filter(
      (h) => h.dientes.includes(ctx.diente) && h.superficie === ctx.superficie,
    );
  }

  function notaEnContexto(ctx: SeleccionDiente | null): string {
    if (!ctx || !borrador) return "";
    return (
      borrador.notas.find((n) => n.diente === ctx.diente && n.superficie === ctx.superficie)
        ?.texto ?? ""
    );
  }

  const hallazgosSeleccion = hallazgosEnContexto(seleccion);
  const notaSeleccion = notaEnContexto(seleccion);
  // Cualquiera de las dos denticiones puede tener cambios sin guardar, no solo la que se
  // está mirando ahora mismo — "Guardar cambios" es una acción global de la sesión.
  const hayCambiosPendientes =
    borradorDifiereDeLoGuardado(borradores.ADULTO, odontogramaAdulto) ||
    borradorDifiereDeLoGuardado(borradores.NINO, odontogramaNino) ||
    planTuvoCambios;

  function actualizarBorrador(mutador: (b: BorradorOdontograma) => BorradorOdontograma) {
    setBorradores((actual) => {
      const actualDenticion = actual[denticion];
      if (!actualDenticion) return actual;
      return { ...actual, [denticion]: mutador(actualDenticion) };
    });
  }

  /** Guarda el estado actual del borrador (de la dentición activa) en la pila de deshacer
   * antes de una edición local — una acción manual nueva siempre invalida cualquier
   * rehacer pendiente. El snapshot recuerda su dentición: con el odontograma unificado, una
   * sola pila deshace en el orden real en que se marcó, sea en dientes de adulto o de niño. */
  function registrarSnapshotAntesDeEditar(descripcion: string) {
    if (!borrador) return;
    setPilaDeshacer((pila) => [
      ...pila,
      { denticion, hallazgos: borrador.hallazgos, notas: borrador.notas, descripcion },
    ]);
    setPilaRehacer([]);
  }

  function alClicDienteOSuperficie(diente: string, superficie: SeleccionDiente["superficie"]) {
    if (!odontogramasGuardados[denticionDeDiente(diente)] || soloLectura) return;

    if (pendienteMultiDiente) {
      completarMultiDiente(diente);
      return;
    }

    setSeleccion({ diente, superficie });
  }

  function onAplicarCondicion(condicionId: string, variante: string | null) {
    if (!seleccion || !borrador) return;
    const condicion = buscarCondicion(condicionId);
    registrarSnapshotAntesDeEditar(`agregar ${condicion?.nombre ?? condicionId}`);
    const nuevoHallazgo: HallazgoDental = {
      id: uuid(),
      registradoEn: new Date().toISOString(),
      condicionId,
      dientes: [seleccion.diente],
      superficie: seleccion.superficie,
      variante,
      estadoColor: condicion?.admiteEstadoColor ? "PENDIENTE" : null,
      nota: null,
    };
    actualizarBorrador((b) => ({ ...b, hallazgos: [...b.hallazgos, nuevoHallazgo] }));
  }

  function onIniciarMultiDiente(condicionId: string) {
    setPendienteMultiDiente({ condicionId });
    setErrorMultiDiente(null);
  }

  function onCancelarMultiDiente() {
    setPendienteMultiDiente(null);
    setErrorMultiDiente(null);
  }

  /** Arcada (fila del diagrama, array FDI en orden de pantalla) a la que pertenece un diente.
   * Con el odontograma unificado cada fila es una arcada de UNA dentición, así que un tramo
   * nunca puede mezclar dientes de adulto y de niño (ej. un puente del 15 al 55). */
  function arcadaDe(diente: string): string[] | null {
    return (
      [DIENTES_ADULTO_SUPERIOR, DIENTES_NINO_SUPERIOR, DIENTES_NINO_INFERIOR, DIENTES_ADULTO_INFERIOR].find(
        (a) => a.includes(diente),
      ) ?? null
    );
  }

  function completarMultiDiente(segundoDiente: string) {
    if (!pendienteMultiDiente || !seleccion || !borrador) return;
    const condicion = buscarCondicion(pendienteMultiDiente.condicionId);
    let dientes = [seleccion.diente, segundoDiente];

    // Cada hallazgo vive en el Odontograma de UNA dentición — un par adulto+niño no tendría
    // dónde guardarse de forma coherente.
    if (denticionDeDiente(segundoDiente) !== denticion) {
      setErrorMultiDiente(
        denticion === "ADULTO" ? "Elige otro diente de adulto." : "Elige otro diente de niño.",
      );
      return;
    }

    if (condicion?.estiloMultiDiente === "TRAMO" || condicion?.estiloMultiDiente === "RANGO") {
      const arcada = arcadaDe(seleccion.diente);
      if (!arcada || !arcada.includes(segundoDiente)) {
        setErrorMultiDiente("Elige un diente de la misma arcada.");
        return;
      }
      const i1 = arcada.indexOf(seleccion.diente);
      const i2 = arcada.indexOf(segundoDiente);
      dientes = arcada.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);
    }

    registrarSnapshotAntesDeEditar(`agregar ${condicion?.nombre ?? pendienteMultiDiente.condicionId}`);
    const nuevoHallazgo: HallazgoDental = {
      id: uuid(),
      registradoEn: new Date().toISOString(),
      condicionId: pendienteMultiDiente.condicionId,
      dientes,
      superficie: null,
      variante: null,
      estadoColor: condicion?.admiteEstadoColor ? "PENDIENTE" : null,
      nota: null,
    };
    actualizarBorrador((b) => ({ ...b, hallazgos: [...b.hallazgos, nuevoHallazgo] }));
    setPendienteMultiDiente(null);
    setErrorMultiDiente(null);
  }

  function onCambiarEstado(hallazgo: HallazgoDental) {
    if (!borrador) return;
    const condicion = buscarCondicion(hallazgo.condicionId);
    registrarSnapshotAntesDeEditar(`cambiar estado de ${condicion?.nombre ?? hallazgo.condicionId}`);
    actualizarBorrador((b) => ({
      ...b,
      hallazgos: b.hallazgos.map((h) =>
        h.id === hallazgo.id
          ? { ...h, estadoColor: h.estadoColor === "REALIZADO" ? "PENDIENTE" : "REALIZADO" }
          : h,
      ),
    }));
  }

  function onEliminarHallazgo(hallazgo: HallazgoDental) {
    if (!borrador) return;
    const condicion = buscarCondicion(hallazgo.condicionId);
    registrarSnapshotAntesDeEditar(`eliminar ${condicion?.nombre ?? hallazgo.condicionId}`);
    actualizarBorrador((b) => ({ ...b, hallazgos: b.hallazgos.filter((h) => h.id !== hallazgo.id) }));
  }

  function onGuardarNota(texto: string) {
    if (!seleccion || !borrador) return;
    const textoLimpio = texto.trim();
    const existente = borrador.notas.find(
      (n) => n.diente === seleccion.diente && n.superficie === seleccion.superficie,
    );
    // Mismo criterio que antes tenía `guardarNotaDental`: sin nota previa + texto vacío no
    // genera ningún cambio (ni para guardar ni para deshacer).
    if (!existente && textoLimpio === "") return;

    registrarSnapshotAntesDeEditar("guardar nota");

    if (existente && textoLimpio === "") {
      actualizarBorrador((b) => ({ ...b, notas: b.notas.filter((n) => n.id !== existente.id) }));
      return;
    }
    const nota: NotaDental = {
      id: existente?.id ?? uuid(),
      diente: seleccion.diente,
      superficie: seleccion.superficie,
      texto: textoLimpio,
      registradoEn: new Date().toISOString(),
    };
    actualizarBorrador((b) => ({
      ...b,
      notas: existente ? b.notas.map((n) => (n.id === existente.id ? nota : n)) : [...b.notas, nota],
    }));
  }

  // Deshacer/Rehacer restauran la dentición que guarda cada snapshot (no la del diente
  // seleccionado ahora): una sola pila para todo el odontograma unificado.
  function onDeshacer() {
    const objetivo = pilaDeshacer[pilaDeshacer.length - 1];
    const borradorObjetivo = objetivo ? borradores[objetivo.denticion] : null;
    if (!objetivo || !borradorObjetivo) return;
    const actual: SnapshotDeshacer = {
      denticion: objetivo.denticion,
      hallazgos: borradorObjetivo.hallazgos,
      notas: borradorObjetivo.notas,
      descripcion: objetivo.descripcion,
    };
    setPilaDeshacer((pila) => pila.slice(0, -1));
    setPilaRehacer((pila) => [...pila, actual]);
    setBorradores((act) => ({
      ...act,
      [objetivo.denticion]: { hallazgos: objetivo.hallazgos, notas: objetivo.notas },
    }));
  }

  function onRehacer() {
    const objetivo = pilaRehacer[pilaRehacer.length - 1];
    const borradorObjetivo = objetivo ? borradores[objetivo.denticion] : null;
    if (!objetivo || !borradorObjetivo) return;
    const actual: SnapshotDeshacer = {
      denticion: objetivo.denticion,
      hallazgos: borradorObjetivo.hallazgos,
      notas: borradorObjetivo.notas,
      descripcion: objetivo.descripcion,
    };
    setPilaRehacer((pila) => pila.slice(0, -1));
    setPilaDeshacer((pila) => [...pila, actual]);
    setBorradores((act) => ({
      ...act,
      [objetivo.denticion]: { hallazgos: objetivo.hallazgos, notas: objetivo.notas },
    }));
  }

  // ---- Plan de tratamiento: mismas reglas de borrador, sin pila de deshacer propia ----

  function onAgregarItemPlan(datos: { fecha: string; diente: string | null; tratamiento: string }) {
    const nuevo: ItemPlanTratamiento = {
      id: uuid(),
      pacienteId,
      fecha: datos.fecha,
      diente: datos.diente,
      tratamiento: datos.tratamiento,
      fechaRealizado: null,
      nota: null,
      version: 1,
      conflictoPendiente: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBorradorPlan((actual) => [nuevo, ...(actual ?? [])]);
    setPlanTuvoCambios(true);
  }

  function onEditarItemPlan(
    id: string,
    datos: { fecha: string; diente: string | null; tratamiento: string },
  ) {
    setBorradorPlan((actual) =>
      (actual ?? []).map((item) =>
        item.id === id
          ? { ...item, fecha: datos.fecha, diente: datos.diente, tratamiento: datos.tratamiento }
          : item,
      ),
    );
    setPlanTuvoCambios(true);
  }

  function onEliminarItemPlan(id: string) {
    setBorradorPlan((actual) => (actual ?? []).filter((item) => item.id !== id));
    setPlanTuvoCambios(true);
  }

  // ---- Guardar / Cancelar (único punto donde el borrador toca la base de datos) ----

  function onCancelar() {
    descartarBorradores();
  }

  /** Persiste el borrador de UNA dentición contra su último estado guardado — hallazgos
   * nuevos/editados/eliminados y notas (upsert/baja), encadenando la `version` que devuelve
   * cada llamada como `baseVersion` de la siguiente (todas pisan el mismo documento). */
  async function commitDenticion(
    borradorD: BorradorOdontograma,
    odontogramaD: Odontograma,
  ): Promise<void> {
    let actual = odontogramaD;

    const notasCambiadas = borradorD.notas.filter((n) => {
      const previa = actual.notas.find((p) => p.diente === n.diente && p.superficie === n.superficie);
      return !previa || previa.texto !== n.texto;
    });
    const notasEliminadas = actual.notas.filter(
      (n) => !borradorD.notas.some((b) => b.diente === n.diente && b.superficie === n.superficie),
    );
    for (const nota of notasCambiadas) {
      const resultado = await guardarNotaDental({ odontogramaRepo, cambioRepo }, actual, {
        diente: nota.diente,
        superficie: nota.superficie,
        texto: nota.texto,
      });
      if (resultado) actual = resultado.odontograma;
    }
    for (const nota of notasEliminadas) {
      const resultado = await guardarNotaDental({ odontogramaRepo, cambioRepo }, actual, {
        diente: nota.diente,
        superficie: nota.superficie,
        texto: "",
      });
      if (resultado) actual = resultado.odontograma;
    }

    const idsGuardados = new Set(odontogramaD.hallazgos.map((h) => h.id));
    const idsBorrador = new Set(borradorD.hallazgos.map((h) => h.id));

    for (const h of borradorD.hallazgos) {
      if (!idsGuardados.has(h.id)) {
        const resultado = await registrarHallazgo({ odontogramaRepo, cambioRepo }, actual, h);
        actual = resultado.odontograma;
      } else {
        const previo = odontogramaD.hallazgos.find((p) => p.id === h.id);
        if (previo && JSON.stringify(previo) !== JSON.stringify(h)) {
          const resultado = await editarHallazgo({ odontogramaRepo, cambioRepo }, actual, h.id, h);
          actual = resultado.odontograma;
        }
      }
    }
    for (const h of odontogramaD.hallazgos) {
      if (!idsBorrador.has(h.id)) {
        const resultado = await eliminarHallazgo({ odontogramaRepo, cambioRepo }, actual, h.id);
        actual = resultado.odontograma;
      }
    }
  }

  async function onGuardarCambios() {
    if (guardando) return;
    setGuardando(true);
    try {
      for (const d of DENTICIONES) {
        const borradorD = borradores[d];
        const odontogramaD = odontogramasGuardados[d];
        if (!borradorD || !odontogramaD) continue;
        if (!borradorDifiereDeLoGuardado(borradorD, odontogramaD)) continue;
        await commitDenticion(borradorD, odontogramaD);
      }

      const planGuardado = itemsPlanGuardados ?? [];
      const planBorrador = borradorPlan ?? [];
      const idsPlanGuardados = new Set(planGuardado.map((i) => i.id));
      const idsPlanBorrador = new Set(planBorrador.map((i) => i.id));

      for (const item of planBorrador) {
        if (!idsPlanGuardados.has(item.id)) {
          await crearItemPlanTratamiento(itemPlanTratamientoRepo, pacienteId, item.id, {
            fecha: item.fecha,
            diente: item.diente,
            tratamiento: item.tratamiento,
          });
        } else {
          const previo = planGuardado.find((p) => p.id === item.id);
          if (
            previo &&
            (previo.fecha !== item.fecha ||
              previo.diente !== item.diente ||
              previo.tratamiento !== item.tratamiento)
          ) {
            await editarItemPlanTratamiento(itemPlanTratamientoRepo, item.id, {
              fecha: item.fecha,
              diente: item.diente,
              tratamiento: item.tratamiento,
              baseVersion: previo.version,
            });
          }
        }
      }
      for (const item of planGuardado) {
        if (!idsPlanBorrador.has(item.id)) {
          await eliminarItemPlanTratamiento(itemPlanTratamientoRepo, {
            id: item.id,
            baseVersion: item.version,
          });
        }
      }

      // Checkpoint del historial — reusa exactamente el mismo mecanismo que ya usaban
      // "Listo" (ficha) y "Finalizar atención" (Cita): archiva "cómo se veía antes" si hubo
      // cambios reales desde el último checkpoint, para ambas denticiones
      // (HistorialOdontogramaTab).
      await registrarCheckpointsOdontogramaPaciente({ odontogramaRepo, cambioRepo }, pacienteId);

      setPilaDeshacer([]);
      setPilaRehacer([]);
      setPlanTuvoCambios(false);
      setSeleccion(null);
      setPendienteMultiDiente(null);
    } catch (error) {
      console.error("Error al guardar los cambios del odontograma", error);
      window.alert("No se pudieron guardar todos los cambios. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.tab}>
      <div className={styles.filaVista}>
        <Tabs
          opciones={TABS_VISTA}
          valorActivo={vista}
          onCambiar={(v) => {
            setVista(v);
            onVistaChange?.(v);
          }}
        />
        {accionesTab}
      </div>

      <div className={styles.encabezado}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={alternarDientesNino}
          aria-pressed={mostrarNino}
        >
          {mostrarNino ? "Ocultar dientes de niño" : "Mostrar dientes de niño"}
        </Button>
        {vista === "actual" && !soloLectura && (
          <div className={styles.accionesDeshacer}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDeshacer}
              disabled={pilaDeshacer.length === 0}
              title={pilaDeshacer.at(-1) ? `Deshacer: ${pilaDeshacer.at(-1)!.descripcion}` : undefined}
            >
              <IconoDeshacer />
              Deshacer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRehacer}
              disabled={pilaRehacer.length === 0}
              title={pilaRehacer.at(-1) ? `Rehacer: ${pilaRehacer.at(-1)!.descripcion}` : undefined}
            >
              Rehacer
              <IconoRehacer />
            </Button>
          </div>
        )}
      </div>

      {vista === "actual" ? (
        <>
          <div className={styles.cuerpo}>
            <PanelHerramientas
              denticion={denticion}
              seleccion={seleccion}
              hallazgosSeleccion={hallazgosSeleccion}
              nota={notaSeleccion}
              pendienteMultiDiente={pendienteMultiDiente !== null}
              errorMultiDiente={errorMultiDiente}
              hayCambiosPendientes={hayCambiosPendientes}
              guardando={guardando}
              onAplicarCondicion={onAplicarCondicion}
              onIniciarMultiDiente={onIniciarMultiDiente}
              onCancelarMultiDiente={onCancelarMultiDiente}
              onCambiarEstado={onCambiarEstado}
              onEliminarHallazgo={onEliminarHallazgo}
              onGuardarNota={onGuardarNota}
              onGuardarCambios={onGuardarCambios}
              onCancelar={onCancelar}
              onAbrirLeyenda={() => setLeyendaAbierta(true)}
            />
            {!listoDiagrama ? (
              <p className="text-body-sm">Cargando…</p>
            ) : (
              <DiagramaBoca
                filas={filas}
                hallazgos={[...(borradorAdulto?.hallazgos ?? []), ...(borradorNino?.hallazgos ?? [])]}
                seleccion={seleccion}
                onClickDiente={(diente) => alClicDienteOSuperficie(diente, null)}
                onClickSuperficie={(diente, superficie) => alClicDienteOSuperficie(diente, superficie)}
              />
            )}
          </div>

          <PlanTratamientoTabla
            items={borradorPlan ?? []}
            soloLectura={soloLectura}
            onAgregar={onAgregarItemPlan}
            onEditar={onEditarItemPlan}
            onEliminar={onEliminarItemPlan}
          />
        </>
      ) : (
        <HistorialOdontogramaTab
          odontogramaIds={[odontogramaAdulto?.id, odontogramaNino?.id].filter(
            (id): id is string => !!id,
          )}
          filas={filas}
        />
      )}

      <LeyendaOdontograma abierto={leyendaAbierta} onCerrar={() => setLeyendaAbierta(false)} />
    </div>
  );
}

function IconoDeshacer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 14 4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoRehacer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m15 14 5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9H10a6 6 0 0 0 0 12h2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
