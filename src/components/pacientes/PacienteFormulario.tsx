"use client";

import { FormEvent, useEffect, useState } from "react";
import { AntecedentePatologico, EstadoCivil, Genero } from "@/domain/entities/Paciente";
import { Consultorio } from "@/domain/entities/Consultorio";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { EditorEtiquetas } from "@/components/ui/EditorEtiquetas";
import { GENERO_OPCIONES } from "@/components/ui/generoOpciones";
import { ESTADO_CIVIL_OPCIONES } from "@/components/ui/estadoCivilOpciones";
import { DocumentoIdentidadInput } from "@/components/ui/DocumentoIdentidadInput";
import {
  PrefijoDocumento,
  combinarDocumentoIdentidad,
  parsearDocumentoIdentidad,
} from "@/components/ui/documentoIdentidad";
import { ANTECEDENTES_PATOLOGICOS_OPCIONES } from "./antecedentesPatologicosOpciones";
import { calcularEdad } from "./formatearFecha";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { IconoContacto, IconoHistoriaClinica, IconoPersona } from "./iconos";
import styles from "./PacienteFormulario.module.css";

/** Umbral de auto-detección del checkbox "Tiene representante" — 007-representante-menor. */
const EDAD_MAXIMA_AUTO_REPRESENTANTE = 12;

export interface ValoresPacienteFormulario {
  nombreCompleto: string;
  /** Formato guardado (ej. "V29838893") — el formulario lo separa en prefijo+número.
   * `null` es "sin documento propio" (paciente con representante). */
  documentoIdentidad: string | null;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  direccion: string;
  genero: Genero | null;
  estadoCivil: EstadoCivil | null;
  ocupacion: string;
  antecedentesPatologicos: AntecedentePatologico[];
  /** Con contenido solo si "Otros" está marcado — única fuente de verdad (research.md #3). */
  antecedentesPatologicosOtros: string[];
  antecedentesHeredofamiliares: string[];
  medicamentosActuales: string[];
  alergias: string[];
  /** 004-consultorios, FR-006/FR-007. `null` es "sin consultorio". */
  consultorioId: string | null;
  /** 007-representante-menor: texto libre, nunca se valida contra otros pacientes. */
  representanteNombre: string | null;
  representanteCedula: string | null;
}

export interface DatosEnviadosPacienteFormulario {
  nombreCompleto: string;
  documentoIdentidad: string | null;
  fechaNacimiento: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  genero: Genero | null;
  estadoCivil: EstadoCivil | null;
  ocupacion: string | null;
  antecedentesPatologicos: AntecedentePatologico[];
  antecedentesPatologicosOtros: string[];
  antecedentesHeredofamiliares: string[];
  medicamentosActuales: string[];
  alergias: string[];
  consultorioId: string | null;
  representanteNombre: string | null;
  representanteCedula: string | null;
}

interface PacienteFormularioProps {
  valoresIniciales: ValoresPacienteFormulario;
  /** Lista de consultorios para el selector opcional (004-consultorios, FR-006, FR-008). */
  consultorios: Consultorio[];
  erroresCampo: Record<string, string>;
  avisoDuplicado: { nombreCompleto: string } | null;
  guardando: boolean;
  textoEnviar: string;
  textoEnviarEnCurso: string;
  onEnviar: (datos: DatosEnviadosPacienteFormulario) => void;
  onCancelar: () => void;
}

/**
 * Card + formulario de datos de paciente, compartido entre alta (`pacientes/nuevo`) y
 * edición (`pacientes/[id]`) — mismo componente, mismo diseño, solo cambian los valores
 * iniciales y qué pasa al enviar (a pedido del usuario: la edición debía verse igual que
 * el alta, no un formulario aparte). Layout según el mockup — docs/design-system.md §6.11.
 */
export function PacienteFormulario({
  valoresIniciales,
  consultorios,
  erroresCampo,
  avisoDuplicado,
  guardando,
  textoEnviar,
  textoEnviarEnCurso,
  onEnviar,
  onCancelar,
}: PacienteFormularioProps) {
  const [nombreCompleto, setNombreCompleto] = useState(valoresIniciales.nombreCompleto);
  const [{ prefijo: prefijoInicial, numero: numeroInicial }] = useState(() =>
    parsearDocumentoIdentidad(valoresIniciales.documentoIdentidad),
  );
  const [prefijoDocumento, setPrefijoDocumento] = useState<PrefijoDocumento>(prefijoInicial);
  const [numeroDocumento, setNumeroDocumento] = useState(numeroInicial);
  const [fechaNacimiento, setFechaNacimiento] = useState(valoresIniciales.fechaNacimiento);
  const [genero, setGenero] = useState<Genero | "">(valoresIniciales.genero ?? "");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil | "">(valoresIniciales.estadoCivil ?? "");
  const [ocupacion, setOcupacion] = useState(valoresIniciales.ocupacion);
  const [consultorioId, setConsultorioId] = useState(valoresIniciales.consultorioId ?? "");
  const [telefono, setTelefono] = useState(valoresIniciales.telefono);
  const [email, setEmail] = useState(valoresIniciales.email);
  const [direccion, setDireccion] = useState(valoresIniciales.direccion);
  const [antecedentesPatologicos, setAntecedentesPatologicos] = useState<AntecedentePatologico[]>(
    valoresIniciales.antecedentesPatologicos,
  );
  const [otrosMarcado, setOtrosMarcado] = useState(
    valoresIniciales.antecedentesPatologicosOtros.length > 0,
  );
  const [antecedentesPatologicosOtros, setAntecedentesPatologicosOtros] = useState(
    valoresIniciales.antecedentesPatologicosOtros,
  );
  const [antecedentesHeredofamiliares, setAntecedentesHeredofamiliares] = useState(
    valoresIniciales.antecedentesHeredofamiliares,
  );
  const [medicamentosActuales, setMedicamentosActuales] = useState(
    valoresIniciales.medicamentosActuales,
  );
  const [alergias, setAlergias] = useState(valoresIniciales.alergias);

  const [tieneRepresentante, setTieneRepresentante] = useState(
    () =>
      Boolean(valoresIniciales.representanteNombre) ||
      (valoresIniciales.fechaNacimiento
        ? calcularEdad(valoresIniciales.fechaNacimiento) < EDAD_MAXIMA_AUTO_REPRESENTANTE
        : false),
  );
  // Una vez que el odontólogo toca el checkbox a mano, deja de auto-recalcularse al
  // cambiar la fecha de nacimiento — auto-detección solo hasta la primera intervención
  // manual (mismo patrón que "Otros" en historia clínica: auto + override).
  const [representanteTocadoManualmente, setRepresentanteTocadoManualmente] = useState(false);
  const [representanteNombre, setRepresentanteNombre] = useState(
    valoresIniciales.representanteNombre ?? "",
  );
  const [{ prefijo: prefijoRepresentanteInicial, numero: numeroRepresentanteInicial }] = useState(() =>
    parsearDocumentoIdentidad(valoresIniciales.representanteCedula),
  );
  const [prefijoRepresentante, setPrefijoRepresentante] = useState<PrefijoDocumento>(
    prefijoRepresentanteInicial,
  );
  const [numeroRepresentante, setNumeroRepresentante] = useState(numeroRepresentanteInicial);

  useEffect(() => {
    if (representanteTocadoManualmente || !fechaNacimiento) return;
    setTieneRepresentante(calcularEdad(fechaNacimiento) < EDAD_MAXIMA_AUTO_REPRESENTANTE);
  }, [fechaNacimiento, representanteTocadoManualmente]);

  function alternarAntecedente(valor: AntecedentePatologico, marcado: boolean) {
    setAntecedentesPatologicos((actual) =>
      marcado ? [...actual, valor] : actual.filter((v) => v !== valor),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onEnviar({
      nombreCompleto,
      documentoIdentidad: combinarDocumentoIdentidad(prefijoDocumento, numeroDocumento),
      fechaNacimiento,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      genero: genero === "" ? null : genero,
      estadoCivil: estadoCivil === "" ? null : estadoCivil,
      ocupacion: ocupacion || null,
      antecedentesPatologicos,
      // "Otros" desmarcado, o marcado sin ninguna etiqueta, se descarta (FR-004) — el
      // checkbox es solo estado de presentación, las etiquetas son la única fuente de
      // verdad (research.md #3).
      antecedentesPatologicosOtros: otrosMarcado ? antecedentesPatologicosOtros : [],
      antecedentesHeredofamiliares,
      medicamentosActuales,
      alergias,
      consultorioId: consultorioId === "" ? null : consultorioId,
      representanteNombre: tieneRepresentante ? representanteNombre.trim() || null : null,
      representanteCedula: tieneRepresentante
        ? combinarDocumentoIdentidad(prefijoRepresentante, numeroRepresentante)
        : null,
    });
  }

  return (
    <Card>
      {/* noValidate: la validación la maneja Zod (mensajes específicos por FR-002), no el
          navegador — si no, el required nativo bloquea el submit antes de tiempo. */}
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          {avisoDuplicado && (
            <Alert variant="error" title="Ya existe un paciente con este documento">
              Se trata de: <strong>{avisoDuplicado.nombreCompleto}</strong>
            </Alert>
          )}
        </CardHeader>
        <CardContent className={styles.secciones}>
          <section>
            <h2 className={styles.tituloSeccion}>
              <IconoPersona />
              Datos personales
            </h2>
            <div className={styles.grid3}>
              <div className={styles.colCompleta}>
                <Input
                  label="Nombre completo"
                  name="nombreCompleto"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  error={erroresCampo.nombreCompleto}
                />
              </div>
              <DocumentoIdentidadInput
                required={!tieneRepresentante}
                prefijo={prefijoDocumento}
                numero={numeroDocumento}
                onChangePrefijo={setPrefijoDocumento}
                onChangeNumero={setNumeroDocumento}
                error={erroresCampo.documentoIdentidad}
              />
              <Input
                label="Fecha de nacimiento"
                name="fechaNacimiento"
                type="date"
                required
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                error={erroresCampo.fechaNacimiento}
              />
              <Select
                label="Género"
                name="genero"
                value={genero}
                onChange={(e) => setGenero(e.target.value as Genero | "")}
              >
                <option value="">Seleccionar...</option>
                {GENERO_OPCIONES.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Estado civil"
                name="estadoCivil"
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil | "")}
              >
                <option value="">Seleccionar...</option>
                {ESTADO_CIVIL_OPCIONES.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Ocupación"
                name="ocupacion"
                placeholder="Ej. Ingeniero de software"
                value={ocupacion}
                onChange={(e) => setOcupacion(e.target.value)}
              />
              <Select
                label="Consultorio"
                name="consultorioId"
                value={consultorioId}
                onChange={(e) => setConsultorioId(e.target.value)}
              >
                <option value="">Sin consultorio</option>
                {consultorios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <Checkbox
              label="Tiene representante"
              checked={tieneRepresentante}
              onChange={(e) => {
                setRepresentanteTocadoManualmente(true);
                setTieneRepresentante(e.target.checked);
              }}
            />
            {tieneRepresentante && (
              <div className={styles.grid2}>
                <Input
                  label="Nombre del representante"
                  name="representanteNombre"
                  placeholder="Ej. María Pérez"
                  value={representanteNombre}
                  onChange={(e) => setRepresentanteNombre(e.target.value)}
                />
                <DocumentoIdentidadInput
                  label="Cédula del representante"
                  prefijo={prefijoRepresentante}
                  numero={numeroRepresentante}
                  onChangePrefijo={setPrefijoRepresentante}
                  onChangeNumero={setNumeroRepresentante}
                />
              </div>
            )}
          </section>

          <section>
            <h2 className={styles.tituloSeccion}>
              <IconoContacto />
              Información de contacto
            </h2>
            <div className={styles.grid2}>
              <Input
                label="Teléfono"
                name="telefono"
                placeholder="0412-1234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={erroresCampo.email}
              />
              <div className={styles.colCompleta}>
                <Input
                  label="Dirección"
                  name="direccion"
                  placeholder="Calle, número, urbanización, ciudad"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className={styles.tituloSeccion}>
              <IconoHistoriaClinica />
              Historia clínica
            </h2>
            <div className={styles.grid3}>
              {ANTECEDENTES_PATOLOGICOS_OPCIONES.map((opcion) => (
                <Checkbox
                  key={opcion.value}
                  label={opcion.label}
                  checked={antecedentesPatologicos.includes(opcion.value)}
                  onChange={(e) => alternarAntecedente(opcion.value, e.target.checked)}
                />
              ))}
              <Checkbox
                label="Otros"
                checked={otrosMarcado}
                onChange={(e) => setOtrosMarcado(e.target.checked)}
              />
            </div>
            {otrosMarcado && (
              <div className={styles.otrosTexto}>
                <EditorEtiquetas
                  label="Otros antecedentes"
                  placeholder="Ej. Fractura de cadera en 2020"
                  valores={antecedentesPatologicosOtros}
                  onChange={setAntecedentesPatologicosOtros}
                />
              </div>
            )}
            <div className={styles.grid1}>
              <EditorEtiquetas
                label="Antecedentes heredofamiliares"
                placeholder="Ej. Madre con hipertensión"
                valores={antecedentesHeredofamiliares}
                onChange={setAntecedentesHeredofamiliares}
              />
              <EditorEtiquetas
                label="Medicamentos actuales"
                placeholder="Ej. Metformina 850mg cada 12 horas"
                valores={medicamentosActuales}
                onChange={setMedicamentosActuales}
              />
              <EditorEtiquetas
                label="Alergias"
                placeholder="Ej. Penicilina"
                valores={alergias}
                onChange={setAlergias}
              />
            </div>
          </section>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? textoEnviarEnCurso : textoEnviar}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
