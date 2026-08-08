import { test, expect } from "@playwright/test";
import { formatearDocumentoParaMostrar } from "./helpers/formatearDocumento";

/**
 * Escenario 5 de quickstart.md — el que valida la razón de ser de toda la arquitectura
 * local-first (research.md #2, #4): crear/editar/archivar sin conexión, y verificar que
 * sincroniza correctamente al reconectar.
 */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Funcionamiento offline y sincronización (Escenario 5)", () => {
  test("crear un paciente sin conexión y verificar que sincroniza al reconectar", async ({
    page,
    context,
  }) => {
    const documento = `V9009${Date.now()}`;

    // 1. Con conexión, se inicia sesión. La primera visita a cada página NO pasa por el
    //    Service Worker (recién queda "activo y controlando" después de esa primera
    //    carga) — hay que esperarlo y volver a visitar cada ruta para que el SW la
    //    intercepte y la cachee de verdad antes de cortar la conexión.
    await iniciarSesion(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    // Se calienta también /pacientes (no solo /pacientes/nuevo): es ahí donde navega
    // después de crear (tasks.md Fase 8) — sin esta visita+reload, esa navegación offline
    // era intermitente (a veces fallaba con net::ERR_FAILED por no estar realmente cacheada).
    await page.goto("/pacientes");
    await page.reload();
    await page.goto("/pacientes/nuevo");
    await page.reload();

    // 2. Se corta la conexión.
    await context.setOffline(true);

    // 3. Se crea un paciente completamente offline — debe funcionar igual, sin errores,
    //    porque la UI escribe siempre contra Dexie local primero (research.md #2).
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Offline");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1993-04-04");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();

    // Vuelve al listado (no a la ficha, que sería una URL nueva sin cachear — ver nota en
    // src/app/pacientes/nuevo/page.tsx), y el paciente ya aparece ahí vía Dexie.
    await page.waitForURL("**/pacientes");
    // Se busca por documento (paginación real, tasks.md Fase 8) — la búsqueda es contra
    // Dexie local, funciona igual sin conexión (research.md #11, Capa A).
    await page.getByLabel("Buscar por nombre o documento").fill(documento);
    const filaPaciente = page.locator("tr", { hasText: formatearDocumentoParaMostrar(documento) });
    await expect(filaPaciente).toContainText("Paciente Offline");

    // 4. Todavía offline: no debería existir en el servidor.
    const respuestaOffline = await page.request
      .get(`/api/patients?q=${documento}`)
      .catch(() => null);
    // (la propia request de verificación también fallaría sin red; se ignora si falla)
    if (respuestaOffline) {
      const cuerpo = await respuestaOffline.json().catch(() => ({ pacientes: [] }));
      expect(cuerpo.pacientes ?? []).toHaveLength(0);
    }

    // 5. Se reconecta. `context.setOffline(false)` no siempre dispara un evento "online"
    //    real del navegador bajo Chromium/CDP (navigator.onLine puede no cambiar) — se
    //    dispara explícitamente para no depender de ese detalle de la emulación de red y
    //    quedar atado al reintento periódico de 30s (INTERVALO_REINTENTO_MS) en su lugar.
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    // 6. El motor de sync reacciona al evento "online" y envía el outbox. Se espera a que
    //    el paciente aparezca en el servidor (polling corto, no depende de un timeout fijo).
    await expect(async () => {
      const respuesta = await page.request.get(`/api/patients?q=${documento}`);
      const cuerpo = await respuesta.json();
      expect(cuerpo.pacientes).toHaveLength(1);
      expect(cuerpo.pacientes[0].nombreCompleto).toBe("Paciente Offline");
    }).toPass({ timeout: 15_000 });
  });
});
