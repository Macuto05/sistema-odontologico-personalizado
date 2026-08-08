/**
 * Entidad de dominio Consultorio (004-consultorios). Sin dependencias de framework
 * (Principio II). Sin `nombreNormalizado` — es un detalle exclusivo de
 * ConsultorioRepositoryPrisma (data-model.md), nunca cruza al dominio.
 */

export interface Consultorio {
  id: string;
  nombre: string;
  createdAt: string;
}

export interface DatosNuevoConsultorio {
  id: string;
  nombre: string;
}
