"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { iniciarSyncEngine } from "@/infrastructure/sync/syncEngine";
import { useTema } from "@/hooks/useTema";

function SyncEngineBootstrap() {
  useEffect(() => iniciarSyncEngine(), []);
  return null;
}

/**
 * Aplica el tema de apariencia (azul/morado, 007-tema-apariencia) a <html> en toda la app,
 * no solo en Configuración — montado acá (no en la página de Configuración) para que la
 * preferencia se refleje sin importar en qué pantalla cargue o navegue el usuario.
 */
function TemaBootstrap() {
  const { tema } = useTema();
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
  }, [tema]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SyncEngineBootstrap />
      <TemaBootstrap />
      {children}
    </SessionProvider>
  );
}
