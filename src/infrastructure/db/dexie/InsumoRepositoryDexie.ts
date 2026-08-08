import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import {
  DatosNuevoInsumo,
  Insumo,
  crearInsumoDesdeDatos,
  estaAReponer,
} from "@/domain/entities/Insumo";
import {
  DatosEdicionInsumo,
  IInsumoRepository,
  OpcionesBusquedaInsumos,
  ResultadoArchivadoInsumo,
  ResultadoBusquedaInsumos,
  ResultadoEdicionInsumo,
} from "@/domain/repositories/IInsumoRepository";
import {
  InsumoArchivadoError,
  InsumoNoEncontradoError,
  InsumoNoEstaArchivadoError,
} from "@/domain/errors";

/**
 * Implementación cliente (local-first) de IInsumoRepository — lee/escribe siempre contra
 * IndexedDB (Dexie), con o sin conexión (research.md #1). Cada escritura encola
 * automáticamente una OutboxOperation para que el syncEngine la replique al servidor.
 *
 * La detección de conflicto real ocurre en el servidor durante la sincronización — acá
 * `editar()` siempre aplica el cambio localmente de forma optimista (`conflicto: false`),
 * mismo criterio que PacienteRepositoryDexie.
 */
export class InsumoRepositoryDexie implements IInsumoRepository {
  async crear(datos: DatosNuevoInsumo): Promise<Insumo> {
    // Sin unicidad que validar: dos insumos pueden llamarse igual (spec §Edge Cases).
    const nuevo = crearInsumoDesdeDatos(datos);
    await db.insumos.add(nuevo);
    await encolarOperacion("INSUMO", nuevo.id, "CREAR", nuevo, nuevo.version);
    return nuevo;
  }

  /**
   * Paginación de pantalla contra Dexie local — instantánea, sin red. Sin filtros
   * adicionales usa el índice `estado` (no carga la tabla entera); con texto/categoría/
   * aReponer se filtra en memoria sobre el subconjunto ya filtrado por estado, porque
   * Dexie no indexa una comparación entre dos campos (`stockActual <= stockMinimo`).
   */
  async buscar(opciones: OpcionesBusquedaInsumos): Promise<ResultadoBusquedaInsumos> {
    const estado = opciones.estado ?? "ACTIVO";
    const pagina = opciones.pagina ?? 1;
    const limite = opciones.limite ?? 10;
    const offset = (pagina - 1) * limite;

    // .toCollection() normaliza el caso "TODOS" (Table) al mismo tipo Collection que
    // devuelve .where().equals() — ambos exponen .sortBy()/.count(), Table por sí sola no.
    const filtradosPorEstado =
      estado === "TODOS" ? db.insumos.toCollection() : db.insumos.where("estado").equals(estado);

    const hayFiltrosAdicionales =
      Boolean(opciones.q) || Boolean(opciones.categoria) || opciones.aReponer === true;

    if (!hayFiltrosAdicionales) {
      const total = await filtradosPorEstado.count();
      const insumos = await filtradosPorEstado
        .sortBy("nombre")
        .then((lista) => lista.slice(offset, offset + limite));
      return { insumos, total };
    }

    const q = opciones.q?.toLowerCase();
    const coincidentes = (await filtradosPorEstado.toArray())
      .filter((i) => {
        if (q && !i.nombre.toLowerCase().includes(q)) return false;
        if (opciones.categoria && i.categoria !== opciones.categoria) return false;
        if (opciones.aReponer === true && !estaAReponer(i)) return false;
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      insumos: coincidentes.slice(offset, offset + limite),
      total: coincidentes.length,
    };
  }

  async obtenerPorId(id: string): Promise<Insumo | null> {
    return (await db.insumos.get(id)) ?? null;
  }

  async listarCategorias(): Promise<string[]> {
    const activos = await db.insumos.where("estado").equals("ACTIVO").toArray();
    const categorias = new Set<string>();
    for (const i of activos) {
      if (i.categoria) categorias.add(i.categoria);
    }
    return [...categorias].sort((a, b) => a.localeCompare(b));
  }

  async contarAReponer(): Promise<number> {
    // FR-010: los archivados nunca cuentan, sin importar su stock (US2-AC4).
    return db.insumos
      .where("estado")
      .equals("ACTIVO")
      .filter((i) => estaAReponer(i))
      .count();
  }

  async editar(id: string, datos: DatosEdicionInsumo): Promise<ResultadoEdicionInsumo> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new InsumoNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") throw new InsumoArchivadoError();

    const actualizado: Insumo = {
      ...actual,
      nombre: datos.nombre,
      categoria: datos.categoria ?? null,
      stockActual: datos.stockActual,
      stockMinimo: datos.stockMinimo,
      version: actual.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.insumos.put(actualizado);
    await encolarOperacion("INSUMO", id, "EDITAR", actualizado, datos.baseVersion);
    return { insumo: actualizado, conflicto: false };
  }

  async archivar(id: string): Promise<ResultadoArchivadoInsumo> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new InsumoNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") {
      return { insumo: actual, yaEstabaArchivado: true };
    }
    const actualizado: Insumo = {
      ...actual,
      estado: "ARCHIVADO",
      updatedAt: new Date().toISOString(),
    };
    await db.insumos.put(actualizado);
    await encolarOperacion("INSUMO", id, "ARCHIVAR", { id }, actual.version);
    return { insumo: actualizado, yaEstabaArchivado: false };
  }

  async reactivar(id: string): Promise<Insumo> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new InsumoNoEncontradoError(id);
    if (actual.estado === "ACTIVO") throw new InsumoNoEstaArchivadoError();
    const actualizado: Insumo = {
      ...actual,
      estado: "ACTIVO",
      updatedAt: new Date().toISOString(),
    };
    await db.insumos.put(actualizado);
    await encolarOperacion("INSUMO", id, "REACTIVAR", { id }, actual.version);
    return actualizado;
  }
}
