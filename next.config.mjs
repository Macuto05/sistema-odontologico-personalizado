import withPWAInit from "@ducanh2912/next-pwa";

/**
 * Service Worker para que la app cargue sin internet (constitution.md Principio VI,
 * research.md #2). Deshabilitado en desarrollo — es la práctica estándar, ya que un SW
 * activo interfiere con el hot-reload de Next.js. Se prueba contra `next build && next
 * start`, no contra `next dev` (ver playwright.config.ts).
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 012-archivos-supabase-storage: el límite de negocio para un archivo adjunto es 20 MB
    // (TAMANO_MAXIMO_ARCHIVO_BYTES, FR-010), pero Next.js 15 impone un tope de 10MB al body
    // de las rutas API por delante de ese chequeo — sin esto, cualquier archivo real de más
    // de 10MB rompe el parseo de FormData con un 500 antes de que el dominio pueda
    // rechazarlo con el 422 correcto. Se deja este límite por encima (25mb, no 20mb) para
    // que sea el chequeo de dominio el que rechace con el 422 legible — si coincidieran, un
    // archivo apenas por encima del límite rompería el parseo antes de llegar a esa validación.
    middlewareClientMaxBodySize: "25mb",
  },
};

export default withPWA(nextConfig);
