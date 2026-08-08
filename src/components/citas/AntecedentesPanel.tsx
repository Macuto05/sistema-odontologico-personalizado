"use client";

import { FormEvent, useState } from "react";
import { AntecedentePatologico, Paciente } from "@/domain/entities/Paciente";
import { PacienteRepositoryDexie } from "@/infrastructure/db/dexie/PacienteRepositoryDexie";
import { editarPaciente } from "@/application/use-cases/editarPaciente";
import { Checkbox } from "@/components/ui/Checkbox";
import { EditorEtiquetas } from "@/components/ui/EditorEtiquetas";
import { Button } from "@/components/ui/Button";
import { ANTECEDENTES_PATOLOGICOS_OPCIONES } from "@/components/pacientes/antecedentesPatologicosOpciones";
import styles from "./AntecedentesPanel.module.css";

const repo = new PacienteRepositoryDexie();

interface AntecedentesPanelProps {
  paciente: Paciente;
}

/**
 * Sección "Antecedentes" del panel de Atención (US5, FR-011, FR-012) — es la misma
 * historia clínica de 003-historia-clinica-paciente, mostrada y editable acá; no
 * introduce un modelo de datos nuevo ni duplicado. Cualquier cambio se guarda en el
 * paciente (no en la cita) y por eso queda disponible sin importar el estado de la cita
 * en curso (FR-012) — mismo patrón "Otros" que `PacienteFormulario`.
 */
export function AntecedentesPanel({ paciente }: AntecedentesPanelProps) {
  const [antecedentesPatologicos, setAntecedentesPatologicos] = useState<AntecedentePatologico[]>(
    paciente.antecedentesPatologicos,
  );
  const [otrosMarcado, setOtrosMarcado] = useState(paciente.antecedentesPatologicosOtros.length > 0);
  const [antecedentesPatologicosOtros, setAntecedentesPatologicosOtros] = useState(
    paciente.antecedentesPatologicosOtros,
  );
  const [antecedentesHeredofamiliares, setAntecedentesHeredofamiliares] = useState(
    paciente.antecedentesHeredofamiliares,
  );
  const [medicamentosActuales, setMedicamentosActuales] = useState(paciente.medicamentosActuales);
  const [alergias, setAlergias] = useState(paciente.alergias);
  const [guardando, setGuardando] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<number | null>(null);

  function alternarAntecedente(valor: AntecedentePatologico, marcado: boolean) {
    setAntecedentesPatologicos((actual) =>
      marcado ? [...actual, valor] : actual.filter((v) => v !== valor),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      // El resto de la ficha (nombre, documento, contacto, consultorio) viaja tal cual
      // venía — este panel solo toca los campos de historia clínica.
      await editarPaciente(repo, paciente.id, {
        nombreCompleto: paciente.nombreCompleto,
        documentoIdentidad: paciente.documentoIdentidad,
        fechaNacimiento: paciente.fechaNacimiento,
        telefono: paciente.telefono,
        email: paciente.email,
        direccion: paciente.direccion,
        genero: paciente.genero,
        estadoCivil: paciente.estadoCivil,
        ocupacion: paciente.ocupacion,
        antecedentesPatologicos,
        antecedentesPatologicosOtros: otrosMarcado ? antecedentesPatologicosOtros : [],
        antecedentesHeredofamiliares,
        medicamentosActuales,
        alergias,
        consultorioId: paciente.consultorioId,
        baseVersion: paciente.version,
      });
      setGuardadoEn(Date.now());
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={onSubmit}>
      <div className={styles.checklist}>
        {ANTECEDENTES_PATOLOGICOS_OPCIONES.map((o) => (
          <Checkbox
            key={o.value}
            label={o.label}
            checked={antecedentesPatologicos.includes(o.value)}
            onChange={(e) => alternarAntecedente(o.value, e.target.checked)}
          />
        ))}
        <Checkbox label="Otros" checked={otrosMarcado} onChange={(e) => setOtrosMarcado(e.target.checked)} />
      </div>
      {otrosMarcado && (
        <EditorEtiquetas
          label="Otros antecedentes"
          valores={antecedentesPatologicosOtros}
          onChange={setAntecedentesPatologicosOtros}
        />
      )}
      <EditorEtiquetas
        label="Antecedentes heredofamiliares"
        valores={antecedentesHeredofamiliares}
        onChange={setAntecedentesHeredofamiliares}
      />
      <EditorEtiquetas
        label="Medicamentos actuales"
        valores={medicamentosActuales}
        onChange={setMedicamentosActuales}
      />
      <EditorEtiquetas label="Alergias" valores={alergias} onChange={setAlergias} />
      <div className={styles.acciones}>
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar antecedentes"}
        </Button>
        {guardadoEn && (
          <span className="text-caption" style={{ color: "var(--color-muted-foreground)" }}>
            Guardado
          </span>
        )}
      </div>
    </form>
  );
}
