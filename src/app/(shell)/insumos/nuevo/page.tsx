"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { ZodError } from "zod";
import { crearInsumo } from "@/application/use-cases/crearInsumo";
import { InsumoRepositoryDexie } from "@/infrastructure/db/dexie/InsumoRepositoryDexie";
import {
  DatosEnviadosInsumoFormulario,
  InsumoFormulario,
} from "@/components/insumos/InsumoFormulario";
import { TopAppBar } from "@/components/ui/TopAppBar";
import styles from "./nuevo.module.css";

const repo = new InsumoRepositoryDexie();

const VALORES_VACIOS = {
  nombre: "",
  categoria: "",
  stockActual: "",
  stockMinimo: "",
};

/**
 * Alta de insumo (US1) — escribe siempre contra Dexie local primero (local-first,
 * research.md #1); funciona sin conexión. El id se genera acá, en el cliente
 * (research.md #3).
 *
 * A diferencia del alta de paciente, siempre vuelve al listado en vez de saltar a la ficha:
 * la ficha de un insumo recién creado es una URL que el Service Worker nunca pudo cachear
 * (mismo problema documentado en research.md #10/#14 de 001-gestion-pacientes), y acá no
 * hay una razón de peso para agregar la prueba de conectividad — el listado ya muestra el
 * insumo nuevo de inmediato vía useLiveQuery.
 */
export default function NuevoInsumoPage() {
  const router = useRouter();
  const categorias = useLiveQuery(() => repo.listarCategorias(), []) ?? [];
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  function onBuscarInsumo() {
    const texto = busqueda.trim();
    if (!texto) return;
    router.push(`/insumos?q=${encodeURIComponent(texto)}`);
  }

  async function onEnviar(datos: DatosEnviadosInsumoFormulario) {
    setErroresCampo({});
    setGuardando(true);

    try {
      const id = uuid();
      await crearInsumo(repo, { id, ...datos });
      router.push("/insumos");
      return;
    } catch (err) {
      if (err instanceof ZodError) {
        const campos: Record<string, string> = {};
        for (const issue of err.issues) {
          const campo = issue.path[0]?.toString();
          if (campo) campos[campo] = issue.message;
        }
        setErroresCampo(campos);
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
        searchPlaceholder="Buscar insumo..."
        searchAriaLabel="Buscar por nombre"
        onSearchSubmit={onBuscarInsumo}
      />
      <main className={styles.pagina}>
        <h1 className={styles.titulo}>Nuevo insumo</h1>
        <InsumoFormulario
          valoresIniciales={VALORES_VACIOS}
          categoriasSugeridas={categorias}
          erroresCampo={erroresCampo}
          guardando={guardando}
          textoEnviar="Crear insumo"
          textoEnviarEnCurso="Creando..."
          onEnviar={onEnviar}
          onCancelar={() => router.push("/insumos")}
        />

        <div className={styles.tips}>
          <Tip tono="warning" icono={<IconoCampana />} titulo="Aviso automático">
            Cuando el stock actual llegue al mínimo, el insumo se resalta en el listado y se
            cuenta en la pantalla de Inicio.
          </Tip>
          <Tip tono="info" icono={<IconoEscudo />} titulo="Datos protegidos">
            La información queda guardada en este dispositivo y se sincroniza de forma segura
            con el servidor.
          </Tip>
          <Tip tono="neutro" icono={<IconoCaja />} titulo="Stock editable">
            Al reponer o consumir material, actualiza el stock actual desde la ficha del
            insumo cuando quieras.
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
  tono: "info" | "warning" | "neutro";
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

function IconoCampana() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
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

function IconoCaja() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" strokeLinejoin="round" />
      <polyline points="3.3 7 12 12 20.7 7" strokeLinejoin="round" />
    </svg>
  );
}
