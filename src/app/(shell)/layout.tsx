"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { SidebarProvider } from "@/components/ui/SidebarContext";
import { SyncStatusPill } from "@/components/ui/SyncStatusPill";
import styles from "./shell.module.css";

const CLAVE_SIDEBAR_COLAPSADA = "sidebar-colapsada";

/**
 * Rutas que renderizan `TopAppBar` — ahí el indicador de sincronización ya viene montado
 * dentro de la barra, y este layout no debe agregar un segundo
 * (011-indicador-sincronizacion, research.md #7).
 *
 * Se enumeran las rutas que **sí** la tienen, no las que no: así una pantalla nueva recibe el
 * indicador fijo por defecto (que es lo que exige FR-010, "en todas las pantallas"). Si esa
 * pantalla además monta `TopAppBar` sin actualizar esta lista, se ven dos indicadores — un
 * error visible de inmediato. Al revés, el olvido sería una pantalla sin indicador: silencioso
 * y difícil de notar.
 */
function tieneTopAppBar(pathname: string): boolean {
  const rutasExactas = ["/", "/configuracion", "/pacientes", "/pacientes/nuevo", "/insumos", "/insumos/nuevo"];
  if (rutasExactas.includes(pathname)) return true;

  // Ficha de insumo (`/insumos/<id>`) — un único segmento después de /insumos. La ficha de
  // paciente (`/pacientes/<id>`) no entra acá: esa pantalla no usa TopAppBar.
  //
  // Las únicas rutas sin TopAppBar son `/citas/<id>`, `/pacientes/<id>` y
  // `/pacientes/<id>/odontograma`. `/pacientes/archivados` no cuenta: es un `redirect()` a
  // `/pacientes?estado=ARCHIVADO`, así que el usuario nunca ve esa ruta renderizada.
  return /^\/insumos\/[^/]+$/.test(pathname);
}

/**
 * Layout compartido del sistema autenticado (002-pantalla-inicio, research.md #4).
 * Envuelve Inicio, Pacientes, Insumos y Configuración con la única sidebar del sistema
 * (docs/design-system.md §6.8, US2). El panel de Atención (`/citas/[id]`) colapsa la
 * sidebar a solo íconos (rediseño visual posterior) sin importar la preferencia del
 * usuario; en el resto de la app, el usuario puede colapsarla/expandirla a demanda con un
 * botón en la propia Sidebar — la preferencia se guarda en `localStorage` y se lee después
 * del primer render (evita mismatch de hidratación SSR/cliente, el mismo criterio que ya
 * se usa para el botón de "Cerrar sesión"). El estado vive acá, no en `Sidebar.tsx`,
 * porque `.content` necesita el mismo valor para compensar el ancho.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const colapsadaPorRuta = pathname?.startsWith("/citas/") ?? false;
  const [colapsadaManual, setColapsadaManual] = useState(false);

  useEffect(() => {
    setColapsadaManual(localStorage.getItem(CLAVE_SIDEBAR_COLAPSADA) === "1");
  }, []);

  function alternarColapso() {
    setColapsadaManual((actual) => {
      const nuevo = !actual;
      localStorage.setItem(CLAVE_SIDEBAR_COLAPSADA, nuevo ? "1" : "0");
      return nuevo;
    });
  }

  const colapsada = colapsadaPorRuta || colapsadaManual;

  return (
    <SidebarProvider colapsada={colapsada}>
      <Sidebar
        colapsada={colapsada}
        mostrarToggle={!colapsadaPorRuta}
        colapsadaManual={colapsadaManual}
        onToggle={alternarColapso}
      />
      {!tieneTopAppBar(pathname ?? "") && <SyncStatusPill variante="fija" />}
      <div className={`${styles.content} ${colapsada ? styles.contentColapsado : ""}`}>
        {children}
      </div>
    </SidebarProvider>
  );
}
