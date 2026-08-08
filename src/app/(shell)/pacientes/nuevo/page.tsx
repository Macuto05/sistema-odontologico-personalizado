"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { ZodError } from "zod";
import { crearPaciente } from "@/application/use-cases/crearPaciente";
import { PacienteRepositoryDexie } from "@/infrastructure/db/dexie/PacienteRepositoryDexie";
import { ConsultorioRepositoryDexie } from "@/infrastructure/db/dexie/ConsultorioRepositoryDexie";
import { DocumentoDuplicadoError } from "@/domain/errors";
import {
  DatosEnviadosPacienteFormulario,
  PacienteFormulario,
} from "@/components/pacientes/PacienteFormulario";
import { hayConexionReal } from "@/components/pacientes/conectividad";
import { TopAppBar } from "@/components/ui/TopAppBar";
import styles from "./nuevo.module.css";

const repo = new PacienteRepositoryDexie();
const consultorioRepo = new ConsultorioRepositoryDexie();

const VALORES_VACIOS = {
  nombreCompleto: "",
  documentoIdentidad: null,
  fechaNacimiento: "",
  telefono: "",
  email: "",
  direccion: "",
  genero: null,
  estadoCivil: null,
  ocupacion: "",
  antecedentesPatologicos: [],
  antecedentesPatologicosOtros: [],
  antecedentesHeredofamiliares: [],
  medicamentosActuales: [],
  alergias: [],
  consultorioId: null,
  representanteNombre: null,
  representanteCedula: null,
};

/**
 * Alta de paciente (US1) — escribe siempre contra Dexie local primero (local-first,
 * research.md #2); funciona sin conexión. El id se genera acá, en el cliente
 * (research.md #3), así se puede navegar a la ficha de inmediato sin esperar al servidor.
 *
 * El formulario en sí (`PacienteFormulario`) es el mismo componente que usa la edición en
 * `pacientes/[id]` — a pedido del usuario, para que ambas pantallas se vean idénticas.
 */
export default function NuevoPacientePage() {
  const router = useRouter();
  const consultorios = useLiveQuery(() => consultorioRepo.listar(), []) ?? [];
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [avisoDuplicado, setAvisoDuplicado] = useState<{ id: string; nombreCompleto: string } | null>(
    null,
  );
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  function onBuscarPaciente() {
    const texto = busqueda.trim();
    if (!texto) return;
    router.push(`/pacientes?q=${encodeURIComponent(texto)}`);
  }

  async function onEnviar(datos: DatosEnviadosPacienteFormulario) {
    setErroresCampo({});
    setAvisoDuplicado(null);
    setGuardando(true);

    try {
      const id = uuid();
      await crearPaciente(repo, { id, ...datos });
      // Salta directo a la ficha — pero solo si hay conexión real (ver conectividad.ts,
      // no alcanza con navigator.onLine). Confirmado con pruebas: el Service Worker no
      // puede servir una URL que nunca pidió, sin importar cacheOnFrontEndNav/
      // aggressiveFrontEndNavCaching (next.config.mjs) — cachean URLs ya visitadas, no
      // rutas nuevas. Sin conexión se cae al listado, que sí está cacheado y donde el
      // paciente nuevo aparece de inmediato vía useLiveQuery.
      router.push((await hayConexionReal()) ? `/pacientes/${id}` : "/pacientes");
      return;
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
      } else {
        throw err;
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <TopAppBar
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar por nombre o documento..."
        searchAriaLabel="Buscar por nombre o documento"
        onSearchSubmit={onBuscarPaciente}
      />
      <main className={styles.pagina}>
      <h1 className={styles.titulo}>Nuevo paciente</h1>
      <PacienteFormulario
        valoresIniciales={VALORES_VACIOS}
        consultorios={consultorios}
        erroresCampo={erroresCampo}
        avisoDuplicado={avisoDuplicado}
        guardando={guardando}
        textoEnviar="Crear paciente"
        textoEnviarEnCurso="Creando..."
        onEnviar={onEnviar}
        onCancelar={() => router.push("/pacientes")}
      />

      <div className={styles.tips}>
        <Tip tono="info" icono={<IconoInfo />} titulo="Atención rápida">
          Verifica el documento antes de guardar para evitar duplicados.
        </Tip>
        <Tip tono="success" icono={<IconoEscudo />} titulo="Datos protegidos">
          La información queda guardada en este dispositivo y se sincroniza de forma segura
          con el servidor.
        </Tip>
        <Tip tono="neutro" icono={<IconoFicha />} titulo="Ficha ampliable">
          Después de crear el perfil puedes agregar o editar teléfono, email y dirección
          cuando quieras.
        </Tip>
      </div>
      </main>
    </>
  );
}

function Tip({
  tono,
  icono,
  titulo,
  children,
}: {
  tono: "info" | "success" | "neutro";
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.tip} ${styles[`tip_${tono}`]}`}>
      <span className={styles.tipIcono} aria-hidden="true">
        {icono}
      </span>
      <div>
        <p className={`${styles.tipTitulo} text-body-sm`}>{titulo}</p>
        <p className="text-caption">{children}</p>
      </div>
    </div>
  );
}

function IconoInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconoEscudo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoFicha() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}
