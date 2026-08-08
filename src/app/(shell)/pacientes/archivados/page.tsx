import { redirect } from "next/navigation";

/**
 * Ruta retirada — el listado y los archivados se unificaron en una sola pantalla con
 * pestañas (`/pacientes`, Tabs Activos/Archivados). Se mantiene como redirect por
 * compatibilidad con cualquier link viejo (`tasks.md` Fase 8).
 */
export default function PacientesArchivadosRedirect() {
  redirect("/pacientes?estado=ARCHIVADO");
}
