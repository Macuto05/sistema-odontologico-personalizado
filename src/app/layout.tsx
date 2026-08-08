import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// next/font descarga y autohospeda la fuente en build time (sin request a Google en
// runtime) — necesario para que siga disponible offline, igual que el resto del app-shell
// cacheado por el Service Worker (docs/design-system.md §2.3, Principio Tech Stack).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Sistema Odontológico",
  description: "Gestión de pacientes para el consultorio",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icon-192.png" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00647C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        {/* #app-shell/#print-root: raíz para imprimir solo una hoja específica (ej. la
            receta de una cita) sin que se cuele el resto de la app — ver globals.css y
            docs/design-system.md. `#print-root` es el destino de un portal montado por el
            componente que necesite imprimir algo; vacío el resto del tiempo. */}
        <div id="app-shell">
          <Providers>{children}</Providers>
        </div>
        <div id="print-root" />
      </body>
    </html>
  );
}
