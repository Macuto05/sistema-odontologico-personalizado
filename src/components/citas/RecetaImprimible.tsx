"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cita } from "@/domain/entities/Cita";
import { Paciente } from "@/domain/entities/Paciente";
import { calcularEdad, formatearSoloFecha } from "@/components/pacientes/formatearFecha";
import styles from "./RecetaImprimible.module.css";

interface RecetaImprimibleProps {
  cita: Cita;
  paciente: Paciente;
}

/**
 * Hoja imprimible de la cita (talonario/receta) — el papel que la odontóloga firma y le
 * entrega al paciente. Media carta, con SU membrete real (no el cian de la app: es
 * papelería de marca personal de la odontóloga, no la interfaz del sistema —
 * `public/logo-fabiola-marrero-recortado.png`, recortado del PNG original que compartió).
 * Sin Diagnóstico (a pedido explícito): solo Paciente, Edad, Cédula, Fecha, Receta médica
 * y Estudios complementarios — los mismos datos que ya viven en la Cita, nada nuevo que
 * cargar ni un flujo de captura aparte.
 *
 * Se monta vía portal en `#print-root` (layout.tsx) en vez de renderizarse en el lugar,
 * para poder imprimirse ella sola sin que se cuele el resto de la ficha del paciente
 * alrededor — ver la regla `@media print` en globals.css (oculta `#app-shell`, muestra
 * `#print-root`). El chequeo de montaje (`montado`) evita acceder a `document` durante el
 * render del servidor.
 */
export function RecetaImprimible({ cita, paciente }: RecetaImprimibleProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) return null;
  const destino = document.getElementById("print-root");
  if (!destino) return null;

  const fecha = cita.finalizadaEn ?? cita.createdAt;

  return createPortal(
    <div className={styles.hoja}>
      {/* eslint-disable-next-line @next/next/no-img-element -- vive en un portal oculto
          (display:none) hasta el momento de imprimir; next/image difiere la carga con
          IntersectionObserver y nunca la dispararía ahí dentro. */}
      <img src="/logo-fabiola-marrero-recortado.png" alt="" className={styles.membrete} />

      <div className={styles.datos}>
        <Dato etiqueta="Paciente" valor={paciente.nombreCompleto} />
        <Dato etiqueta="Edad" valor={`${calcularEdad(paciente.fechaNacimiento)} años`} />
        <Dato etiqueta="Cédula" valor={paciente.documentoIdentidad ?? "—"} />
        <Dato etiqueta="Fecha" valor={formatearSoloFecha(fecha)} />
      </div>

      <div className={styles.bloque}>
        <h2 className={styles.tituloRx}>
          <span className={styles.simboloRx}>℞</span> Receta médica
        </h2>
        {cita.recetaItems.length === 0 ? (
          <p className={styles.vacio}>Sin medicamentos indicados.</p>
        ) : (
          <ol className={styles.medicamentos}>
            {cita.recetaItems.map((item) => (
              <li key={item.id}>
                <p className={styles.medicamentoNombre}>{item.medicamento}</p>
                <p className={styles.medicamentoDetalle}>
                  {item.dosis}, {item.frecuencia}, por {item.duracion}
                  {item.indicaciones && ` (${item.indicaciones})`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className={styles.bloque}>
        <h2 className={styles.titulo}>Estudios complementarios</h2>
        {cita.estudioItems.length === 0 ? (
          <p className={styles.vacio}>Sin estudios solicitados.</p>
        ) : (
          <ul className={styles.estudios}>
            {cita.estudioItems.map((item) => (
              <li key={item.id}>
                {item.nombre}
                {item.motivo && ` — ${item.motivo}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.firma}>
        <div className={styles.lineaFirma} />
        <p>Firma y sello</p>
        <p className={styles.contacto}>
          <IconoTelefono />
          (0414) 818 06 00
          <span className={styles.separadorContacto}>/</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- mismo motivo que el
              membrete: vive oculta hasta imprimir, next/image no la cargaría ahí dentro. */}
          <img src="/logo-instagram.png" alt="" className={styles.iconoInstagram} />
          @od.fabiolamarrero
        </p>
      </div>
    </div>,
    destino,
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <p className={styles.dato}>
      <span className={styles.datoEtiqueta}>{etiqueta}:</span> {valor}
    </p>
  );
}

/** No un emoji de teléfono literal (📞): un emoji no se puede recolorear con CSS, y acá
 * tiene que quedar del mismo morado que el resto de las etiquetas del talonario — así que
 * es un ícono propio en `currentColor`, mismo trazo (stroke, no relleno) que el resto de
 * los íconos del sistema. Path del ícono "phone" de Feather/Lucide (geometría de catálogo
 * conocida, no dibujada a mano — mismo criterio que evitar geometría SVG improvisada sin
 * verificación visual). */
function IconoTelefono() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.iconoTelefono}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
