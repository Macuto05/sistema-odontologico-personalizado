import { z } from "zod";

/** FR-001, FR-002: nombre obligatorio, no vacío. Unicidad (FR-003) la valida el repositorio. */
export const crearConsultorioInputSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1, "El nombre del consultorio es obligatorio"),
});

export type CrearConsultorioInput = z.infer<typeof crearConsultorioInputSchema>;
