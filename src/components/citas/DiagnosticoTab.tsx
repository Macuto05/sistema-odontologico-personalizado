"use client";

import { CategoriaConsulta } from "@/domain/entities/Cita";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { CATEGORIA_CONSULTA_OPCIONES } from "@/components/pacientes/categoriaConsultaOpciones";
import styles from "./DiagnosticoTab.module.css";

export interface ValoresDiagnostico {
  motivoConsulta: string;
  diagnostico: string;
  categoria: CategoriaConsulta | "";
}

interface DiagnosticoTabProps {
  valores: ValoresDiagnostico;
  onChange: (patch: Partial<ValoresDiagnostico>) => void;
}

/**
 * Pestaña "Diagnóstico" del panel de Atención (US2, FR-005, FR-006). Componente
 * controlado: no guarda nada por sí mismo — solo actualiza el borrador en memoria de
 * `PanelAtencion`. Todo el borrador se crea y persiste junto al presionar "Finalizar
 * atención" (User Story 6, decisión revisada tras la primera versión funcionando).
 *
 * 006-odontograma, FR-017: el campo "Plan de tratamiento" que vivía acá se eliminó — su
 * función se trasladó a la tabla estructurada del tab Odontograma. El resto de esta
 * pestaña (motivo de consulta, diagnóstico, categoría) no cambia.
 */
export function DiagnosticoTab({ valores, onChange }: DiagnosticoTabProps) {
  return (
    <div className={styles.formulario}>
      <Textarea
        label="Motivo de consulta"
        value={valores.motivoConsulta}
        onChange={(e) => onChange({ motivoConsulta: e.target.value })}
      />
      <Textarea
        label="Diagnóstico"
        value={valores.diagnostico}
        onChange={(e) => onChange({ diagnostico: e.target.value })}
      />
      <Select
        label="Categoría"
        value={valores.categoria}
        onChange={(e) => onChange({ categoria: e.target.value as CategoriaConsulta | "" })}
      >
        <option value="">Sin categoría</option>
        {CATEGORIA_CONSULTA_OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
