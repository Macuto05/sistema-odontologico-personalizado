"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ZodError } from "zod";
import { editarInsumo } from "@/application/use-cases/editarInsumo";
import { archivarInsumo } from "@/application/use-cases/archivarInsumo";
import { reactivarInsumo } from "@/application/use-cases/reactivarInsumo";
import { InsumoRepositoryDexie } from "@/infrastructure/db/dexie/InsumoRepositoryDexie";
import { estaAReponer } from "@/domain/entities/Insumo";
import {
  DatosEnviadosInsumoFormulario,
  InsumoFormulario,
} from "@/components/insumos/InsumoFormulario";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { VolverLink } from "@/components/ui/VolverLink";
import styles from "./ficha.module.css";

const repo = new InsumoRepositoryDexie();

/**
 * Ficha/edición de un insumo (US4, US5). Reutiliza `InsumoFormulario` precargado, igual que
 * la ficha de paciente reutiliza `PacienteFormulario`. El stock actual se edita
 * directamente — así se registra una reposición o un consumo (research.md #4: sin kardex de
 * movimientos en esta feature).
 */
export default function FichaInsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const insumo = useLiveQuery(() => repo.obtenerPorId(id), [id]);
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
    if (!insumo) return;
    setErroresCampo({});
    setGuardando(true);

    try {
      await editarInsumo(repo, id, { ...datos, baseVersion: insumo.version });
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

  async function onArchivar() {
    await archivarInsumo(repo, id);
  }

  async function onReactivar() {
    await reactivarInsumo(repo, id);
  }

  const barra = (
    <TopAppBar
      searchValue={busqueda}
      onSearchChange={setBusqueda}
      searchPlaceholder="Buscar insumo..."
      searchAriaLabel="Buscar por nombre"
      onSearchSubmit={onBuscarInsumo}
    />
  );

  if (insumo === undefined) {
    return (
      <>
        {barra}
        <main className={styles.pagina}>
          <p className="text-body-sm">Cargando…</p>
        </main>
      </>
    );
  }

  if (insumo === null) {
    return (
      <>
        {barra}
        <main className={styles.pagina}>
          <VolverLink href="/insumos" texto="Volver a Insumos" />
          <div className={styles.aviso}>
            <Alert variant="error">Este insumo no existe o fue eliminado.</Alert>
          </div>
        </main>
      </>
    );
  }

  const archivado = insumo.estado === "ARCHIVADO";
  const aReponer = estaAReponer(insumo);

  return (
    <>
      {barra}
      <main className={styles.pagina}>
        <VolverLink href="/insumos" texto="Volver a Insumos" />

        <div className={styles.encabezado}>
          <div className={styles.tituloBloque}>
            <h1 className={styles.titulo}>{insumo.nombre}</h1>
            {archivado ? (
              <Badge variant="muted">Archivado</Badge>
            ) : aReponer ? (
              <Badge variant="warning">A reponer</Badge>
            ) : (
              <Badge variant="success">En stock</Badge>
            )}
          </div>
          <div className={styles.acciones}>
            {archivado ? (
              <Button variant="outline" onClick={onReactivar}>
                Reactivar
              </Button>
            ) : (
              <Button variant="outline" onClick={onArchivar}>
                Archivar
              </Button>
            )}
          </div>
        </div>

        {/* FR-012: un insumo archivado no se edita — hay que reactivarlo primero. */}
        {archivado && (
          <div className={styles.aviso}>
            <Alert variant="info" title="Insumo archivado">
              Para volver a editar sus datos o su stock, reactivá el insumo primero.
            </Alert>
          </div>
        )}

        {!archivado && (
          <InsumoFormulario
            valoresIniciales={{
              nombre: insumo.nombre,
              categoria: insumo.categoria ?? "",
              stockActual: String(insumo.stockActual),
              stockMinimo: String(insumo.stockMinimo),
            }}
            categoriasSugeridas={categorias}
            erroresCampo={erroresCampo}
            guardando={guardando}
            textoEnviar="Guardar cambios"
            textoEnviarEnCurso="Guardando..."
            onEnviar={onEnviar}
            onCancelar={() => router.push("/insumos")}
          />
        )}
      </main>
    </>
  );
}
