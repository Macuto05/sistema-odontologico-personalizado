import { test, expect, BrowserContext, Page } from "@playwright/test";

/**
 * Indicador de estado de sincronización — 011-indicador-sincronizacion, quickstart.md.
 *
 * Todo lo que toca IndexedDB real o los eventos de red del navegador se prueba acá y no en
 * Vitest (plan.md §Testing): la lógica pura ya está cubierta en
 * tests/unit/derivarEstadoSync.test.ts y tests/unit/syncStatus.test.ts.
 */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

/**
 * Dispara un evento de ventana, reintentando si el documento está navegando justo en ese
 * instante (`Execution context was destroyed`) — pasa al volver online después de haber
 * creado registros offline, cuando el router revalida la pantalla.
 */
async function dispararEnVentana(page: Page, nombre: "online" | "offline") {
  await expect(async () => {
    await page.evaluate((n) => window.dispatchEvent(new Event(n)), nombre);
  }).toPass({ timeout: 15_000 });
}

/** Fuerza un ciclo de sync inmediato sin esperar el intervalo de 30s (ver offline-sync.spec.ts). */
async function forzarSync(page: Page) {
  await dispararEnVentana(page, "online");
}

/** El pill lleva su estado en el nombre accesible — no hace falta acoplarse a clases CSS. */
function indicador(page: Page) {
  return page.getByRole("button", { name: /Estado de sincronización/ });
}

/**
 * Corta la conexión y se asegura de que el documento actual lo refleje.
 *
 * Limitación de la emulación de red de Chromium por CDP, verificada en este proyecto: tras un
 * `page.goto()` el documento nuevo vuelve a reportar `navigator.onLine === true` aunque el
 * contexto siga offline, y un `dispatchEvent(new Event("offline"))` sintético no alcanza
 * porque el indicador relee `navigator.onLine`. Un `false`→`true` reaplica la emulación sobre
 * el documento actual. Es un artefacto del entorno de pruebas, no del comportamiento real del
 * navegador (donde la bandera sí persiste entre navegaciones).
 */
async function cortarConexion(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
}

async function restaurarConexion(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  // `setOffline(false)` no siempre dispara un "online" real bajo CDP (ver offline-sync.spec.ts).
  await dispararEnVentana(page, "online");
}

test.describe("Indicador de sincronización", () => {
  test("US1: refleja la pérdida de conexión en pantallas con y sin TopAppBar", async ({
    page,
    context,
  }) => {
    const documento = `V9010${Date.now()}`;

    await iniciarSesion(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();

    // Se necesita un paciente real para poder abrir su ficha, que es una de las tres
    // pantallas que no montan TopAppBar (las otras son /citas/<id> y el odontograma).
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Sin Barra");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1992-03-03");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes(\/|$)/);
    await page.waitForLoadState("domcontentloaded");
    await forzarSync(page);

    let pacienteId = "";
    await expect(async () => {
      const respuesta = await page.request.get(`/api/patients?q=${documento}`);
      const cuerpo = await respuesta.json();
      expect(cuerpo.pacientes).toHaveLength(1);
      pacienteId = cuerpo.pacientes[0].id;
    }).toPass({ timeout: 20_000 });

    // --- Pantalla CON TopAppBar (/pacientes) ---
    await page.goto("/pacientes");
    await page.reload();
    await expect(indicador(page)).toHaveAccessibleName(/Con conexión/);

    await cortarConexion(context, page);

    // Sin recargar la página (FR-002).
    await expect(indicador(page)).toHaveAccessibleName(/Sin conexión/);

    // Exactamente uno: TopAppBar lo monta y el layout no debe agregar un segundo
    // (research.md #7).
    await expect(indicador(page)).toHaveCount(1);

    // El panel informa cuántos cambios quedaron sin enviar (FR-003).
    await indicador(page).click();
    await expect(page.getByRole("dialog", { name: "Detalle de sincronización" })).toContainText(
      "Cambios guardados localmente",
    );

    // --- Pantalla SIN TopAppBar (ficha del paciente) ---
    // Ojo: /pacientes/archivados NO sirve para esto — es un redirect a /pacientes, que sí
    // tiene TopAppBar, así que no ejercitaría la variante fija en absoluto.
    await restaurarConexion(context, page);
    await page.goto(`/pacientes/${pacienteId}`);
    await page.reload();

    // Acá el pill lo monta ShellLayout (variante fija), no TopAppBar — y sigue habiendo uno
    // solo (FR-010).
    await expect(indicador(page)).toHaveCount(1);

    await cortarConexion(context, page);
    await expect(indicador(page)).toHaveAccessibleName(/Sin conexión/);

    // Al volver la conexión, el indicador se recupera solo (FR-002).
    await restaurarConexion(context, page);
    await expect(indicador(page)).toHaveAccessibleName(/Con conexión/, { timeout: 20_000 });
  });

  test("US2: informa el envío de cambios pendientes y la última sincronización", async ({
    page,
    context,
  }) => {
    const documento = `V9011${Date.now()}`;

    await iniciarSesion(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.goto("/pacientes");
    await page.reload();
    await page.goto("/pacientes/nuevo");
    await page.reload();

    await cortarConexion(context, page);

    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Indicador");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1990-01-01");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes(\/|$)/);

    // El paciente ya está en la base local aunque no haya red — confirma que el cambio quedó
    // encolado, y de paso deja que la pantalla se asiente antes de reconectar.
    await page.getByLabel("Buscar por nombre o documento").fill("Paciente Indicador");
    await expect(page.locator("tr", { hasText: "Paciente Indicador" }).first()).toBeVisible();

    // El panel del estado offline ya se verifica en US1; acá lo que importa es qué muestra el
    // indicador cuando ese envío se completa.
    await restaurarConexion(context, page);

    // El ciclo termina y el indicador vuelve a "Con conexión" con una marca de tiempo
    // reciente (FR-006). El % del push (FR-004) es demasiado rápido con un solo cambio como
    // para observarlo de forma determinista — se cubre en el unit test de porcentajeDe().
    await expect(indicador(page)).toHaveAccessibleName(/Con conexión/, { timeout: 20_000 });

    await expect(async () => {
      const respuesta = await page.request.get(`/api/patients?q=${documento}`);
      const cuerpo = await respuesta.json();
      expect(cuerpo.pacientes).toHaveLength(1);
    }).toPass({ timeout: 20_000 });

    await indicador(page).click();
    const panel = page.getByRole("dialog", { name: "Detalle de sincronización" });
    await expect(panel).toContainText("Todo sincronizado");
    await expect(panel).toContainText("Última sincronización");
    // Ya hubo un ciclo completo: no puede seguir mostrando el guion de "nunca sincronizó".
    await expect(panel).toContainText(/recién|hace \d+/);
  });

  test("US3: avisa cuando un cambio queda en conflicto y el aviso persiste entre pantallas", async ({
    browser,
  }) => {
    const sufijo = Date.now();
    const documento = `V9012${sufijo}`;

    // --- Dispositivo A: crea el paciente y lo sincroniza ---
    const contextoA = await browser.newContext();
    const dispositivoA = await contextoA.newPage();
    await iniciarSesion(dispositivoA);
    await dispositivoA.evaluate(() => navigator.serviceWorker.ready);
    await dispositivoA.reload();
    await dispositivoA.goto("/pacientes/nuevo");
    await dispositivoA.getByLabel("Nombre completo").fill("Paciente Conflicto");
    await dispositivoA.getByLabel("Documento de identidad").fill(documento);
    await dispositivoA.getByLabel("Fecha de nacimiento").fill("1991-02-02");
    await dispositivoA.getByRole("button", { name: /crear paciente|creando/i }).click();
    await dispositivoA.waitForURL(/\/pacientes(\/|$)/);
    await forzarSync(dispositivoA);

    let pacienteId = "";
    await expect(async () => {
      const respuesta = await dispositivoA.request.get(`/api/patients?q=${documento}`);
      const cuerpo = await respuesta.json();
      expect(cuerpo.pacientes).toHaveLength(1);
      pacienteId = cuerpo.pacientes[0].id;
    }).toPass({ timeout: 20_000 });

    // --- A edita sin conexión (encola con la versión que conoce) ---
    await dispositivoA.goto(`/pacientes/${pacienteId}`);
    await dispositivoA.reload();
    await cortarConexion(contextoA, dispositivoA);

    await dispositivoA.getByRole("button", { name: /editar/i }).first().click();
    await dispositivoA.getByLabel("Nombre completo").fill("Editado en A (offline)");
    await dispositivoA.getByRole("button", { name: /guardar/i }).first().click();

    // --- Mientras tanto, el dispositivo B edita el mismo paciente y sí llega al servidor,
    //     dejando la versión de A obsoleta ---
    const contextoB = await browser.newContext();
    const dispositivoB = await contextoB.newPage();
    await iniciarSesion(dispositivoB);
    await dispositivoB.goto(`/pacientes/${pacienteId}`);
    await forzarSync(dispositivoB);
    await dispositivoB.getByRole("button", { name: /editar/i }).first().click();
    await dispositivoB.getByLabel("Nombre completo").fill("Editado en B (online)");
    await dispositivoB.getByRole("button", { name: /guardar/i }).first().click();
    await forzarSync(dispositivoB);

    await expect(async () => {
      const respuesta = await dispositivoB.request.get(`/api/patients?q=${documento}`);
      const cuerpo = await respuesta.json();
      expect(cuerpo.pacientes[0].nombreCompleto).toBe("Editado en B (online)");
    }).toPass({ timeout: 20_000 });

    // --- A reconecta: su edición choca contra la versión ya avanzada del servidor ---
    await restaurarConexion(contextoA, dispositivoA);

    await expect(indicador(dispositivoA)).toHaveAccessibleName(/con conflicto/, {
      timeout: 20_000,
    });

    // El panel identifica el registro afectado y la operación que falló (FR-008).
    await indicador(dispositivoA).click();
    const panel = dispositivoA.getByRole("dialog", { name: "Detalle de sincronización" });
    await expect(panel).toContainText("Revisar estos cambios");
    await expect(panel).toContainText("Paciente");
    await expect(panel).toContainText("editar");
    await dispositivoA.keyboard.press("Escape");

    // El aviso no depende de la pantalla: sigue estando al navegar a otra (FR-007).
    await dispositivoA.goto("/pacientes");
    await expect(indicador(dispositivoA)).toHaveAccessibleName(/con conflicto/, {
      timeout: 20_000,
    });

    await contextoA.close();
    await contextoB.close();
  });
});
