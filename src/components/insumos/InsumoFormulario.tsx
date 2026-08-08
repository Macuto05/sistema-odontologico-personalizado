"use client";

import { FormEvent, useState } from "react";
import { calcularAReponer } from "@/domain/entities/Insumo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { IconoCaja, IconoStock } from "./iconos";
import styles from "./InsumoFormulario.module.css";

export interface ValoresInsumoFormulario {
  nombre: string;
  categoria: string;
  /** String, no number: un input numérico vacío es "" y hay que poder distinguirlo de 0. */
  stockActual: string;
  stockMinimo: string;
}

export interface DatosEnviadosInsumoFormulario {
  nombre: string;
  categoria: string | null;
  /** `null` cuando el campo quedó vacío — Zod lo rechaza con el mensaje de obligatorio,
   * en vez de que un `Number("")` silencioso lo convierta en 0 (FR-002). */
  stockActual: number | null;
  stockMinimo: number | null;
}

interface InsumoFormularioProps {
  valoresIniciales: ValoresInsumoFormulario;
  /** Categorías ya usadas — sugerencias del datalist, no un catálogo cerrado (research.md #5). */
  categoriasSugeridas: string[];
  erroresCampo: Record<string, string>;
  guardando: boolean;
  textoEnviar: string;
  textoEnviarEnCurso: string;
  onEnviar: (datos: DatosEnviadosInsumoFormulario) => void;
  onCancelar: () => void;
}

/** `""` → null (campo vacío); si no, el número. No usa `Number("")` (que da 0). */
function aNumeroONull(valor: string): number | null {
  const recortado = valor.trim();
  if (recortado === "") return null;
  const n = Number(recortado);
  return Number.isNaN(n) ? null : n;
}

/**
 * Card + formulario de datos de insumo, compartido entre alta (`insumos/nuevo`) y edición
 * (`insumos/[id]`) — mismo criterio que `PacienteFormulario`: un solo componente para que
 * ambas pantallas se vean idénticas.
 */
export function InsumoFormulario({
  valoresIniciales,
  categoriasSugeridas,
  erroresCampo,
  guardando,
  textoEnviar,
  textoEnviarEnCurso,
  onEnviar,
  onCancelar,
}: InsumoFormularioProps) {
  const [nombre, setNombre] = useState(valoresIniciales.nombre);
  const [categoria, setCategoria] = useState(valoresIniciales.categoria);
  const [stockActual, setStockActual] = useState(valoresIniciales.stockActual);
  const [stockMinimo, setStockMinimo] = useState(valoresIniciales.stockMinimo);

  const actualNum = aNumeroONull(stockActual);
  const minimoNum = aNumeroONull(stockMinimo);
  // Vista previa de FR-004 mientras se escribe — solo si ambos valores están cargados.
  const quedaraAReponer =
    actualNum !== null && minimoNum !== null && calcularAReponer(actualNum, minimoNum);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onEnviar({
      nombre,
      categoria: categoria.trim() || null,
      stockActual: actualNum,
      stockMinimo: minimoNum,
    });
  }

  return (
    <Card>
      {/* noValidate: la validación la maneja Zod (mensajes específicos por FR-002/FR-003),
          no el navegador — si no, el required nativo bloquea el submit antes de tiempo. */}
      <form onSubmit={onSubmit} noValidate>
        <CardHeader />
        <CardContent className={styles.secciones}>
          <section>
            <h2 className={styles.tituloSeccion}>
              <IconoCaja />
              Datos del insumo
            </h2>
            <div className={styles.grid2}>
              <div className={styles.colCompleta}>
                <Input
                  label="Nombre"
                  name="nombre"
                  required
                  placeholder="Ej. Guantes de nitrilo talla M"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  error={erroresCampo.nombre}
                />
              </div>
              <div className={styles.colCompleta}>
                <Input
                  label="Categoría"
                  name="categoria"
                  placeholder="Ej. Desechables"
                  list="categorias-insumo"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  error={erroresCampo.categoria}
                />
                {/* Sugerencias de lo ya cargado, sin cerrar la lista: sigue siendo texto
                    libre, se puede escribir una categoría nueva (research.md #5). */}
                <datalist id="categorias-insumo">
                  {categoriasSugeridas.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          <section>
            <h2 className={styles.tituloSeccion}>
              <IconoStock />
              Control de stock
            </h2>
            <div className={styles.grid2}>
              <Input
                label="Stock actual"
                name="stockActual"
                type="number"
                min={0}
                step={1}
                required
                placeholder="Ej. 20"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                error={erroresCampo.stockActual}
              />
              <Input
                label="Stock mínimo"
                name="stockMinimo"
                type="number"
                min={0}
                step={1}
                required
                placeholder="Ej. 5"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                error={erroresCampo.stockMinimo}
              />
            </div>
            {quedaraAReponer && (
              <div className={styles.avisoReponer}>
                <Alert variant="warning">
                  Con estos valores el insumo queda marcado como <strong>a reponer</strong>: el
                  stock actual es igual o menor al mínimo.
                </Alert>
              </div>
            )}
          </section>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? textoEnviarEnCurso : textoEnviar}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
