"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { ZodError } from "zod";
import { db } from "@/infrastructure/db/dexie/db";
import { PacienteRepositoryDexie } from "@/infrastructure/db/dexie/PacienteRepositoryDexie";
import { ConsultorioRepositoryDexie } from "@/infrastructure/db/dexie/ConsultorioRepositoryDexie";
import { OdontogramaRepositoryDexie } from "@/infrastructure/db/dexie/OdontogramaRepositoryDexie";
import { CambioOdontogramaRepositoryDexie } from "@/infrastructure/db/dexie/CambioOdontogramaRepositoryDexie";
import { editarPaciente } from "@/application/use-cases/editarPaciente";
import { archivarPaciente } from "@/application/use-cases/archivarPaciente";
import { reactivarPaciente } from "@/application/use-cases/reactivarPaciente";
import { registrarCheckpointsOdontogramaPaciente } from "@/application/use-cases/registrarCheckpointsOdontogramaPaciente";
import { DocumentoDuplicadoError, PacienteArchivadoError } from "@/domain/errors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { VolverLink } from "@/components/ui/VolverLink";
import { Tabs, TabOption } from "@/components/ui/Tabs";
import { GENERO_LABEL } from "@/components/ui/generoOpciones";
import { ESTADO_CIVIL_LABEL } from "@/components/ui/estadoCivilOpciones";
import { ANTECEDENTE_PATOLOGICO_LABEL } from "@/components/pacientes/antecedentesPatologicosOpciones";
import { formatearDocumentoIdentidad } from "@/components/ui/documentoIdentidad";
import { calcularEdad, formatearFecha, formatearFechaHora } from "@/components/pacientes/formatearFecha";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { ListaEtiquetas, ColorListaEtiquetas } from "@/components/ui/ListaEtiquetas";
import { OdontogramaTab, VistaOdontograma } from "@/components/odontograma/OdontogramaTab";
import { PlanesTab } from "@/components/planes/PlanesTab";
import { CitasTab } from "@/components/pacientes/CitasTab";
import { ArchivosTab } from "@/components/pacientes/ArchivosTab";
import {
  DatosEnviadosPacienteFormulario,
  PacienteFormulario,
} from "@/components/pacientes/PacienteFormulario";
import {
  IconoArchivos,
  IconoCalendario,
  IconoContacto,
  IconoDireccion,
  IconoDocumento,
  IconoEdad,
  IconoEmail,
  IconoEstadoCivil,
  IconoGenero,
  IconoHistoriaClinica,
  IconoOcupacion,
  IconoOdontograma,
  IconoPersona,
  IconoPlanes,
  IconoTelefono,
} from "@/components/pacientes/iconos";
import styles from "./ficha.module.css";

const repo = new PacienteRepositoryDexie();
const consultorioRepo = new ConsultorioRepositoryDexie();
const odontogramaRepo = new OdontogramaRepositoryDexie();
const cambioOdontogramaRepo = new CambioOdontogramaRepositoryDexie();

type TabFicha = "informacion" | "odontograma" | "planes" | "citas" | "archivos";

const TABS: TabOption<TabFicha>[] = [
  { valor: "informacion", etiqueta: "Información", icono: <IconoPersona /> },
  { valor: "odontograma", etiqueta: "Odontograma", icono: <IconoOdontograma /> },
  { valor: "planes", etiqueta: "Planes", icono: <IconoPlanes /> },
  { valor: "citas", etiqueta: "Citas", icono: <IconoCalendario /> },
  { valor: "archivos", etiqueta: "Archivos", icono: <IconoArchivos /> },
];

/**
 * Ficha de paciente: vista con pestañas (Información/Odontograma/Planes/Citas/Archivos —
 * rediseño visual posterior, antes era una sola tarjeta larga con todo apilado), edición
 * (US3), archivado/reactivación (US4) e iniciar una atención (005-atencion-paciente, US1).
 * Planes (009-planes-tratamiento) es de solo consulta más 2 campos (nota, checkbox
 * "Realizado") — a diferencia de Odontograma, no tiene su propio botón Editar/Listo: se
 * habilita/deshabilita directo según `archivado` (FR-012 de esa spec). Archivos es el único
 * punto de entrada para
 * subir archivos del paciente — la subida colgada de un Estudio dentro de una Cita se
 * retiró de `CitaDetalleSoloLectura` (fase anterior de este mismo rediseño).
 */
export default function FichaPacientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const paciente = useLiveQuery(() => db.pacientes.get(params.id), [params.id]);
  const consultorios = useLiveQuery(() => consultorioRepo.listar(), []) ?? [];

  const [tabActivo, setTabActivo] = useState<TabFicha>("informacion");
  const [editando, setEditando] = useState(false);
  const [editandoOdontograma, setEditandoOdontograma] = useState(false);
  // "Editar"/"Listo" no tiene sentido en la vista Historial del tab Odontograma (es de solo
  // lectura por diseño) — se oculta mientras esa vista esté activa.
  const [vistaOdontograma, setVistaOdontograma] = useState<VistaOdontograma>("actual");
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [avisoDuplicado, setAvisoDuplicado] = useState<{ nombreCompleto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<"archivar" | "reactivar" | null>(null);

  /** No crea nada todavía — el panel de Atención abre en modo borrador; la Cita recién se
   * crea al presionar "Finalizar atención" (spec §Assumptions, revisión posterior). */
  function onNuevaCita() {
    if (!paciente) return;
    router.push(`/citas/${uuid()}?pacienteId=${paciente.id}`);
  }

  function iniciarEdicion() {
    setErroresCampo({});
    setAvisoDuplicado(null);
    setEditando(true);
  }

  async function onEnviar(datos: DatosEnviadosPacienteFormulario) {
    if (!paciente) return;
    setGuardando(true);
    setErroresCampo({});
    setAvisoDuplicado(null);

    try {
      await editarPaciente(repo, paciente.id, { ...datos, baseVersion: paciente.version });
      setEditando(false);
    } catch (err) {
      if (err instanceof ZodError) {
        const campos: Record<string, string> = {};
        for (const issue of err.issues) {
          const campo = issue.path[0]?.toString();
          if (campo) campos[campo] = issue.message;
        }
        setErroresCampo(campos);
      } else if (err instanceof DocumentoDuplicadoError) {
        setAvisoDuplicado(err.pacienteExistente);
      } else if (err instanceof PacienteArchivadoError) {
        setEditando(false);
      } else {
        throw err;
      }
    } finally {
      setGuardando(false);
    }
  }

  async function onConfirmarArchivar() {
    if (!paciente) return;
    await archivarPaciente(repo, paciente.id);
    setConfirmando(null);
  }

  async function onConfirmarReactivar() {
    if (!paciente) return;
    await reactivarPaciente(repo, paciente.id);
    setConfirmando(null);
  }

  if (paciente === undefined) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <p className="text-body-sm">Cargando…</p>
      </main>
    );
  }

  if (paciente === null) {
    return (
      <main style={{ padding: "var(--space-6)" }}>
        <p className="text-body">No se encontró el paciente.</p>
        <Link href="/pacientes">
          <Button variant="outline">Volver al listado</Button>
        </Link>
      </main>
    );
  }

  const archivado = paciente.estado === "ARCHIVADO";
  const sinContacto = !paciente.telefono && !paciente.email && !paciente.direccion;
  const sinHistoriaClinica =
    paciente.antecedentesPatologicos.length === 0 &&
    paciente.antecedentesPatologicosOtros.length === 0 &&
    paciente.antecedentesHeredofamiliares.length === 0 &&
    paciente.medicamentosActuales.length === 0 &&
    paciente.alergias.length === 0;

  return (
    <main className={styles.pagina}>
      <VolverLink href="/pacientes" texto="Volver al listado" />

      {paciente.conflictoPendiente && (
        <Alert variant="warning" title="Este paciente tiene una edición en conflicto">
          Se detectó una edición hecha en otro dispositivo antes de sincronizar. Ambas
          versiones se conservaron — revisa los datos actuales y vuelve a guardar si hace
          falta corregir algo.
        </Alert>
      )}

      {editando ? (
        <div className={styles.formularioContenedor}>
          <PacienteFormulario
            valoresIniciales={{
              nombreCompleto: paciente.nombreCompleto,
              documentoIdentidad: paciente.documentoIdentidad,
              fechaNacimiento: paciente.fechaNacimiento,
              telefono: paciente.telefono ?? "",
              email: paciente.email ?? "",
              direccion: paciente.direccion ?? "",
              genero: paciente.genero,
              estadoCivil: paciente.estadoCivil,
              ocupacion: paciente.ocupacion ?? "",
              antecedentesPatologicos: paciente.antecedentesPatologicos,
              antecedentesPatologicosOtros: paciente.antecedentesPatologicosOtros,
              antecedentesHeredofamiliares: paciente.antecedentesHeredofamiliares,
              medicamentosActuales: paciente.medicamentosActuales,
              alergias: paciente.alergias,
              consultorioId: paciente.consultorioId,
              representanteNombre: paciente.representanteNombre,
              representanteCedula: paciente.representanteCedula,
            }}
            consultorios={consultorios}
            erroresCampo={erroresCampo}
            avisoDuplicado={avisoDuplicado}
            guardando={guardando}
            textoEnviar="Guardar cambios"
            textoEnviarEnCurso="Guardando..."
            onEnviar={onEnviar}
            onCancelar={() => setEditando(false)}
          />
        </div>
      ) : (
        <>
          <header className={styles.encabezado}>
            <div className={styles.identidad}>
              <Avatar nombre={paciente.nombreCompleto} tamano="lg" />
              <div className={styles.identidadTexto}>
                <div className={styles.nombreEstado}>
                  <h1 className="text-heading-lg">{paciente.nombreCompleto}</h1>
                  <Badge variant={archivado ? "muted" : "success"}>
                    {archivado ? "Archivado" : "Activo"}
                  </Badge>
                </div>
                {paciente.email && (
                  <p className={`text-body-sm ${styles.subtitulo}`}>{paciente.email}</p>
                )}
              </div>
            </div>
            <div className={styles.accionesEncabezado}>
              {!archivado && <Button onClick={onNuevaCita}>Nueva cita</Button>}
              {!archivado ? (
                <Button variant="destructive" onClick={() => setConfirmando("archivar")}>
                  Archivar
                </Button>
              ) : (
                <Button onClick={() => setConfirmando("reactivar")}>Reactivar</Button>
              )}
            </div>
          </header>

          <Tabs opciones={TABS} valorActivo={tabActivo} onCambiar={setTabActivo} variante="subrayado" />

          <div role="tabpanel" className={styles.panelTab}>
            {tabActivo === "informacion" && (
              <div className={styles.secciones}>
                <section className={styles.tarjeta}>
                  <div className={styles.tituloConAccion}>
                    <h2 className={styles.tituloSeccion}>
                      <IconoPersona />
                      Datos personales
                    </h2>
                    {!archivado && (
                      <button type="button" className={styles.editarBoton} onClick={iniciarEdicion}>
                        <IconoLapiz />
                        Editar
                      </button>
                    )}
                  </div>
                  <div className={styles.grid3}>
                    <CampoConIcono
                      icono={<IconoDocumento />}
                      label="Documento"
                      valor={formatearDocumentoIdentidad(paciente.documentoIdentidad)}
                    />
                    <CampoConIcono
                      icono={<IconoCalendario />}
                      label="Fecha de nacimiento"
                      valor={formatearFecha(paciente.fechaNacimiento)}
                    />
                    <CampoConIcono
                      icono={<IconoEdad />}
                      label="Edad"
                      valor={`${calcularEdad(paciente.fechaNacimiento)} años`}
                    />
                    {paciente.genero && (
                      <CampoConIcono
                        icono={<IconoGenero />}
                        label="Género"
                        valor={GENERO_LABEL[paciente.genero]}
                      />
                    )}
                    {paciente.estadoCivil && (
                      <CampoConIcono
                        icono={<IconoEstadoCivil />}
                        label="Estado civil"
                        valor={ESTADO_CIVIL_LABEL[paciente.estadoCivil]}
                      />
                    )}
                    {paciente.ocupacion && (
                      <CampoConIcono icono={<IconoOcupacion />} label="Ocupación" valor={paciente.ocupacion} />
                    )}
                    {paciente.representanteNombre && (
                      <CampoConIcono
                        icono={<IconoPersona />}
                        label="Representante"
                        valor={paciente.representanteNombre}
                      />
                    )}
                    {paciente.representanteCedula && (
                      <CampoConIcono
                        icono={<IconoDocumento />}
                        label="Cédula del representante"
                        valor={formatearDocumentoIdentidad(paciente.representanteCedula)}
                      />
                    )}
                  </div>
                  {archivado && (
                    <p className={`text-body-sm ${styles.sinDatos}`} style={{ marginTop: "var(--space-4)" }}>
                      Este paciente está archivado. Reactivalo para poder editar sus datos.
                    </p>
                  )}
                </section>

                <section className={styles.tarjeta}>
                  <h2 className={styles.tituloSeccion}>
                    <IconoContacto />
                    Información de contacto
                  </h2>
                  {sinContacto ? (
                    <p className={`text-body-sm ${styles.sinDatos}`}>
                      Sin información de contacto registrada.
                    </p>
                  ) : (
                    <div className={styles.grid2}>
                      {paciente.telefono && (
                        <CampoConIcono icono={<IconoTelefono />} label="Teléfono" valor={paciente.telefono} />
                      )}
                      {paciente.email && (
                        <CampoConIcono icono={<IconoEmail />} label="Email" valor={paciente.email} />
                      )}
                      {paciente.direccion && (
                        <div className={styles.colCompleta}>
                          <CampoConIcono
                            icono={<IconoDireccion />}
                            label="Dirección"
                            valor={paciente.direccion}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className={styles.tarjeta}>
                  <h2 className={styles.tituloSeccion}>
                    <IconoHistoriaClinica />
                    Historia clínica
                  </h2>
                  {sinHistoriaClinica ? (
                    <p className={`text-body-sm ${styles.sinDatos}`}>
                      Sin historia clínica registrada.
                    </p>
                  ) : (
                    <div className={styles.grid1}>
                      {(paciente.antecedentesPatologicos.length > 0 ||
                        paciente.antecedentesPatologicosOtros.length > 0) && (
                        <CampoEtiquetas
                          icono={<IconoHistoriaClinica />}
                          label="Antecedentes patológicos"
                          etiquetas={[
                            ...paciente.antecedentesPatologicos.map(
                              (a) => ANTECEDENTE_PATOLOGICO_LABEL[a],
                            ),
                            ...paciente.antecedentesPatologicosOtros,
                          ]}
                          color="azul"
                        />
                      )}
                      {paciente.antecedentesHeredofamiliares.length > 0 && (
                        <CampoEtiquetas
                          icono={<IconoHistoriaClinica />}
                          label="Antecedentes heredofamiliares"
                          etiquetas={paciente.antecedentesHeredofamiliares}
                          color="verde"
                        />
                      )}
                      {paciente.medicamentosActuales.length > 0 && (
                        <CampoEtiquetas
                          icono={<IconoHistoriaClinica />}
                          label="Medicamentos actuales"
                          etiquetas={paciente.medicamentosActuales}
                          color="amarillo"
                        />
                      )}
                      {paciente.alergias.length > 0 && (
                        <CampoEtiquetas
                          icono={<IconoHistoriaClinica />}
                          label="Alergias"
                          etiquetas={paciente.alergias}
                          color="rojo"
                        />
                      )}
                    </div>
                  )}
                </section>

                <section className={styles.tarjeta}>
                  <h2 className={styles.tituloSeccion}>
                    <IconoCalendario />
                    Datos del sistema
                  </h2>
                  <div className={styles.grid2}>
                    <CampoConIcono
                      icono={<IconoCalendario />}
                      label="Fecha de registro"
                      valor={formatearFechaHora(paciente.createdAt)}
                    />
                    <CampoConIcono
                      icono={<IconoCalendario />}
                      label="Última actualización"
                      valor={formatearFechaHora(paciente.updatedAt)}
                    />
                  </div>
                </section>
              </div>
            )}

            {tabActivo === "odontograma" && (
              <div className={styles.tarjeta}>
                <OdontogramaTab
                  paciente={paciente}
                  soloLectura={editandoOdontograma ? undefined : true}
                  onVistaChange={setVistaOdontograma}
                  accionesTab={
                    !archivado &&
                    vistaOdontograma === "actual" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          // "Listo" cierra la sesión de edición — si hubo cambios reales,
                          // archiva en el historial cómo se veía antes de esta sesión
                          // (feedback directo de la odontóloga: no quiere una entrada por
                          // cada hallazgo agregado, solo un "antes" por sesión terminada).
                          if (editandoOdontograma) {
                            void registrarCheckpointsOdontogramaPaciente(
                              { odontogramaRepo, cambioRepo: cambioOdontogramaRepo },
                              params.id,
                            );
                          }
                          setEditandoOdontograma((actual) => !actual);
                        }}
                      >
                        {editandoOdontograma ? "Listo" : "Editar"}
                      </Button>
                    )
                  }
                />
              </div>
            )}

            {tabActivo === "planes" && (
              <div className={styles.tarjeta}>
                <PlanesTab pacienteId={paciente.id} soloLectura={archivado} />
              </div>
            )}

            {tabActivo === "citas" && (
              <div className={styles.tarjeta}>
                <CitasTab paciente={paciente} onNuevaCita={onNuevaCita} />
              </div>
            )}

            {tabActivo === "archivos" && (
              <div className={styles.tarjeta}>
                <ArchivosTab pacienteId={paciente.id} />
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        abierto={confirmando === "archivar"}
        titulo="¿Archivar a este paciente?"
        onCerrar={() => setConfirmando(null)}
      >
        <p className="text-body">
          <strong>{paciente.nombreCompleto}</strong> dejará de aparecer en el listado
          activo. Todos sus datos se conservan y puedes reactivarlo cuando quieras.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setConfirmando(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirmarArchivar}>
            Archivar
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        abierto={confirmando === "reactivar"}
        titulo="¿Reactivar a este paciente?"
        onCerrar={() => setConfirmando(null)}
      >
        <p className="text-body">
          <strong>{paciente.nombreCompleto}</strong> volverá a aparecer en el listado
          activo y podrás editar sus datos de nuevo.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setConfirmando(null)}>
            Cancelar
          </Button>
          <Button onClick={onConfirmarReactivar}>Reactivar</Button>
        </ModalFooter>
      </Modal>
    </main>
  );
}

function CampoEtiquetas({
  icono,
  label,
  etiquetas,
  color,
}: {
  icono: ReactNode;
  label: string;
  etiquetas: string[];
  color: ColorListaEtiquetas;
}) {
  return (
    <div className={styles.campo}>
      <span className={styles.campoIcono} aria-hidden="true">
        {icono}
      </span>
      <div>
        <p className={`${styles.campoLabel} text-caption`}>{label}</p>
        <ListaEtiquetas etiquetas={etiquetas} color={color} />
      </div>
    </div>
  );
}

function CampoConIcono({ icono, label, valor }: { icono: ReactNode; label: string; valor: string }) {
  return (
    <div className={styles.campo}>
      <span className={styles.campoIcono} aria-hidden="true">
        {icono}
      </span>
      <div>
        <p className={`${styles.campoLabel} text-caption`}>{label}</p>
        <p className="text-body">{valor}</p>
      </div>
    </div>
  );
}

function IconoLapiz() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
