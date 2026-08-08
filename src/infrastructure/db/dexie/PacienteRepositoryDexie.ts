import { db } from "./db";
import { encolarOperacion } from "../../sync/outboxQueue";
import { DatosNuevoPaciente, Paciente, crearPacienteDesdeDatos } from "@/domain/entities/Paciente";
import {
  DatosEdicionPaciente,
  IPacienteRepository,
  OpcionesBusquedaPacientes,
  ResultadoArchivado,
  ResultadoBusquedaPacientes,
  ResultadoEdicion,
} from "@/domain/repositories/IPacienteRepository";
import {
  DocumentoDuplicadoError,
  PacienteArchivadoError,
  PacienteNoEncontradoError,
  PacienteNoEstaArchivadoError,
} from "@/domain/errors";

/**
 * Duplicado deliberado del cálculo de edad (no se importa de components/pacientes/ — capa
 * de infraestructura no depende de la capa de UI, mismo criterio que otros helpers chicos
 * duplicados en este archivo). Edad en años cumplidos a hoy, para el filtro "Filtros" del
 * listado (007-representante-menor).
 */
function calcularEdadParaFiltro(fechaNacimientoIso: string): number {
  const nacimiento = new Date(fechaNacimientoIso);
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
  const aunNoCumpleEsteAno =
    hoy.getUTCMonth() < nacimiento.getUTCMonth() ||
    (hoy.getUTCMonth() === nacimiento.getUTCMonth() && hoy.getUTCDate() < nacimiento.getUTCDate());
  if (aunNoCumpleEsteAno) edad -= 1;
  return edad;
}

/**
 * Implementación cliente (local-first) de IPacienteRepository — lee/escribe siempre contra
 * IndexedDB (Dexie), con o sin conexión (research.md #2). Cada escritura encola
 * automáticamente una OutboxOperation para que el syncEngine la replique al servidor.
 *
 * La detección de conflicto real ocurre en el servidor durante la sincronización — acá
 * `editar()` siempre aplica el cambio localmente de forma optimista (`conflicto: false`);
 * si el servidor detecta un conflicto al sincronizar, el syncEngine actualiza el registro
 * local con el `conflictoPendiente` que venga en la respuesta.
 */
export class PacienteRepositoryDexie implements IPacienteRepository {
  async crear(datos: DatosNuevoPaciente): Promise<Paciente> {
    // Sin documento (paciente con representante, FR-001 de 007-representante-menor) no hay
    // nada que comparar — la unicidad solo aplica cuando el paciente tiene uno propio.
    if (datos.documentoIdentidad) {
      const existente = await this.obtenerPorDocumento(datos.documentoIdentidad);
      if (existente) throw new DocumentoDuplicadoError(existente);
    }

    const nuevo = crearPacienteDesdeDatos(datos);
    await db.pacientes.add(nuevo);
    await encolarOperacion("PACIENTE", nuevo.id, "CREAR", nuevo, nuevo.version);
    return nuevo;
  }

  /**
   * Paginación de pantalla contra Dexie local — instantánea, sin red (research.md #11,
   * Capa A). Sin ningún filtro adicional usa el índice `estado` (no carga la tabla entera
   * en memoria); con texto/edad/consultorio, Dexie no soporta esos filtros indexados, así
   * que se filtra en memoria sobre el subconjunto ya filtrado por estado — sigue siendo
   * local, y de todas formas solo se devuelven `limite` filas al renderer.
   */
  async buscar(opciones: OpcionesBusquedaPacientes): Promise<ResultadoBusquedaPacientes> {
    const estado = opciones.estado ?? "ACTIVO";
    const pagina = opciones.pagina ?? 1;
    const limite = opciones.limite ?? 10;
    const offset = (pagina - 1) * limite;

    // .toCollection() normaliza el caso "TODOS" (Table) al mismo tipo Collection que
    // devuelve .where().equals() — ambos exponen .sortBy()/.count(), Table por sí sola no.
    const filtradosPorEstado =
      estado === "TODOS" ? db.pacientes.toCollection() : db.pacientes.where("estado").equals(estado);

    const hayFiltrosAdicionales =
      Boolean(opciones.q) ||
      opciones.edadMin !== undefined ||
      opciones.edadMax !== undefined ||
      opciones.consultorioId !== undefined;

    if (!hayFiltrosAdicionales) {
      const total = await filtradosPorEstado.count();
      const pacientes = await filtradosPorEstado
        .sortBy("nombreCompleto")
        .then((lista) => lista.slice(offset, offset + limite));
      return { pacientes, total };
    }

    const q = opciones.q?.toLowerCase();
    // Igual que en PacienteRepositoryPrisma: se compara contra los dígitos de la cédula,
    // no contra el valor completo (el prefijo V-/E- es un detalle de guardado, no algo
    // que el odontólogo tipee al buscar). `includes`, no `endsWith` — tiene que ir
    // filtrando en tiempo real a medida que se escribe cada número, igual que ya hace la
    // búsqueda por nombre (research.md #15 de 001-gestion-pacientes).
    const digitosDocumento = opciones.q?.replace(/\D/g, "") ?? "";
    const coincidentes = (await filtradosPorEstado.toArray())
      .filter((p) => {
        if (opciones.q) {
          const coincideNombre = p.nombreCompleto.toLowerCase().includes(q!);
          // Sin documento propio (representante), nunca matchea por documento — solo por nombre.
          const coincideDocumento = digitosDocumento
            ? (p.documentoIdentidad?.includes(digitosDocumento) ?? false)
            : p.documentoIdentidad === opciones.q;
          if (!coincideNombre && !coincideDocumento) return false;
        }
        if (opciones.edadMin !== undefined || opciones.edadMax !== undefined) {
          const edad = calcularEdadParaFiltro(p.fechaNacimiento);
          if (opciones.edadMin !== undefined && edad < opciones.edadMin) return false;
          if (opciones.edadMax !== undefined && edad > opciones.edadMax) return false;
        }
        if (opciones.consultorioId !== undefined && p.consultorioId !== opciones.consultorioId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    return {
      pacientes: coincidentes.slice(offset, offset + limite),
      total: coincidentes.length,
    };
  }

  async obtenerPorId(id: string): Promise<Paciente | null> {
    return (await db.pacientes.get(id)) ?? null;
  }

  async obtenerPorDocumento(documentoIdentidad: string): Promise<Paciente | null> {
    const p = await db.pacientes.where("documentoIdentidad").equals(documentoIdentidad).first();
    return p ?? null;
  }

  async editar(id: string, datos: DatosEdicionPaciente): Promise<ResultadoEdicion> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new PacienteNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") throw new PacienteArchivadoError();

    // Igual que en crear(): sin documento nuevo no hay nada que comparar por unicidad.
    if (datos.documentoIdentidad && datos.documentoIdentidad !== actual.documentoIdentidad) {
      const conDocumento = await this.obtenerPorDocumento(datos.documentoIdentidad);
      if (conDocumento && conDocumento.id !== id) {
        throw new DocumentoDuplicadoError(conDocumento);
      }
    }

    const actualizado: Paciente = {
      ...actual,
      nombreCompleto: datos.nombreCompleto,
      documentoIdentidad: datos.documentoIdentidad,
      fechaNacimiento: datos.fechaNacimiento,
      telefono: datos.telefono ?? null,
      email: datos.email ?? null,
      direccion: datos.direccion ?? null,
      genero: datos.genero ?? null,
      estadoCivil: datos.estadoCivil ?? null,
      ocupacion: datos.ocupacion ?? null,
      antecedentesPatologicos: datos.antecedentesPatologicos ?? [],
      antecedentesPatologicosOtros: datos.antecedentesPatologicosOtros ?? [],
      antecedentesHeredofamiliares: datos.antecedentesHeredofamiliares ?? [],
      medicamentosActuales: datos.medicamentosActuales ?? [],
      alergias: datos.alergias ?? [],
      consultorioId: datos.consultorioId ?? null,
      representanteNombre: datos.representanteNombre ?? null,
      representanteCedula: datos.representanteCedula ?? null,
      version: actual.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.pacientes.put(actualizado);
    await encolarOperacion("PACIENTE", id, "EDITAR", actualizado, datos.baseVersion);
    return { paciente: actualizado, conflicto: false };
  }

  async archivar(id: string): Promise<ResultadoArchivado> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new PacienteNoEncontradoError(id);
    if (actual.estado === "ARCHIVADO") {
      return { paciente: actual, yaEstabaArchivado: true };
    }
    const actualizado: Paciente = { ...actual, estado: "ARCHIVADO", updatedAt: new Date().toISOString() };
    await db.pacientes.put(actualizado);
    await encolarOperacion("PACIENTE", id, "ARCHIVAR", { id }, actual.version);
    return { paciente: actualizado, yaEstabaArchivado: false };
  }

  async reactivar(id: string): Promise<Paciente> {
    const actual = await this.obtenerPorId(id);
    if (!actual) throw new PacienteNoEncontradoError(id);
    if (actual.estado === "ACTIVO") throw new PacienteNoEstaArchivadoError();
    const actualizado: Paciente = { ...actual, estado: "ACTIVO", updatedAt: new Date().toISOString() };
    await db.pacientes.put(actualizado);
    await encolarOperacion("PACIENTE", id, "REACTIVAR", { id }, actual.version);
    return actualizado;
  }
}
