import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Tema = "azul" | "morado";

const CLAVE_TEMA = "tema";
const TEMA_PREDETERMINADO: Tema = "azul";

function esTemaValido(valor: unknown): valor is Tema {
  return valor === "azul" || valor === "morado";
}

function leerTemaGuardado(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    return esTemaValido(guardado) ? guardado : TEMA_PREDETERMINADO;
  } catch {
    // localStorage inaccesible (modo privado estricto, política del navegador) — se sigue
    // mostrando el tema predeterminado (FR-008).
    return TEMA_PREDETERMINADO;
  }
}

function guardarTema(nuevoTema: Tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, nuevoTema);
  } catch {
    // No persiste, pero el tema igual se aplica para la sesión actual (FR-008).
  }
}

// Estado compartido a nivel de módulo, no de instancia de componente: TemaBootstrap
// (providers.tsx) y la sección "Apariencia" de Configuración montan cada uno su propia
// instancia de useTema(); sin un store compartido, setTema() en una no se reflejaría en la
// otra. useSyncExternalStore es la forma estándar de React de exponer un store así sin
// agregar un Context ni una dependencia nueva.
type Listener = () => void;
const listeners = new Set<Listener>();
let temaActual: Tema = TEMA_PREDETERMINADO;

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notificar() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return temaActual;
}

function getServerSnapshot() {
  return TEMA_PREDETERMINADO;
}

/**
 * Preferencia de tema de apariencia (azul/morado), persistida por navegador en
 * localStorage["tema"] — mismo criterio que "sidebar-colapsada" en (shell)/layout.tsx: el
 * valor guardado se sincroniza recién en un efecto post-mount para evitar mismatch de
 * hidratación SSR/cliente (data-model.md).
 */
export function useTema() {
  const tema = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const guardado = leerTemaGuardado();
    if (guardado !== temaActual) {
      temaActual = guardado;
      notificar();
    }
  }, []);

  const setTema = useCallback((nuevoTema: Tema) => {
    temaActual = nuevoTema;
    guardarTema(nuevoTema);
    notificar();
  }, []);

  return { tema, setTema };
}
