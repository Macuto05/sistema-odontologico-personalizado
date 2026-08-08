"use client";

import { createContext, useContext } from "react";

/** Estado de colapso de la Sidebar (docs/design-system.md §6.20) — fuente única para que
 * elementos `position:fixed` (que el margin-left de `.content` no alcanza) puedan
 * sincronizarse sin recalcular su propia lógica de colapso. */
const SidebarContext = createContext(false);

export function SidebarProvider({
  colapsada,
  children,
}: {
  colapsada: boolean;
  children: React.ReactNode;
}) {
  return <SidebarContext.Provider value={colapsada}>{children}</SidebarContext.Provider>;
}

export function useSidebarColapsada(): boolean {
  return useContext(SidebarContext);
}
