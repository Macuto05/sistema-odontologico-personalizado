import { test, expect } from "@playwright/test";

/** Verificación de responsive del panel de Atención en los tres breakpoints de
 * docs/design-system.md §4.0 (005-atencion-paciente, FR-025, Principio VI). Segunda ronda
 * de rediseño visual: la sidebar de navegación general se colapsa a solo íconos en esta
 * pantalla (más espacio); Antecedentes e Historial de citas anteriores se agrupan en un
 * Drawer que se abre desde una pestaña fija al borde derecho — un solo patrón responsive
 * en los tres breakpoints. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesionYAtencion(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");

  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Responsive");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-09-09");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
}

test.describe("Panel de Atención — responsive (§4.0)", () => {
  test("celular (<640px): el Drawer combinado abre a pantalla completa", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await iniciarSesionYAtencion(page, `V9901${Date.now()}`);

    const drawer = page.getByRole("dialog", { name: "Antecedentes e historial" });
    await expect(drawer).toBeHidden();

    await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box?.width).toBeGreaterThan(370);
    await expect(drawer.getByRole("button", { name: "Antecedentes", exact: true })).toBeVisible();
  });

  test("tablet (640–1023px): la sidebar queda colapsada a íconos y el Drawer abre con ancho fijo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await iniciarSesionYAtencion(page, `V9902${Date.now()}`);

    const sidebar = page.getByRole("navigation", { name: "Navegación principal" });
    const anchoSidebar = (await sidebar.boundingBox())?.width;
    expect(anchoSidebar).toBeLessThan(100);

    await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
    const drawer = page.getByRole("dialog", { name: "Antecedentes e historial" });
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box?.width).toBeLessThan(768);
  });

  test("escritorio (≥1024px): la sidebar queda colapsada, sin scroll horizontal de página, y el Odontograma entra sin scrollbar propio", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await iniciarSesionYAtencion(page, `V9903${Date.now()}`);

    const sidebar = page.getByRole("navigation", { name: "Navegación principal" });
    // La navegación a /citas/[id] es del lado del cliente (no recarga la página) — el
    // colapso forzado por ruta ahora anima (200ms, feedback posterior de la odontóloga),
    // así que hay que esperar a que termine antes de medir el ancho final.
    await page.waitForTimeout(250);
    const anchoSidebar = (await sidebar.boundingBox())?.width;
    expect(anchoSidebar).toBeLessThan(100);

    const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
    const anchoVentana = await page.evaluate(() => window.innerWidth);
    expect(anchoDocumento).toBeLessThanOrEqual(anchoVentana + 1);

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await expect(page.getByRole("button", { name: "Diente 18 completo" })).toBeVisible();
    const diagrama = page.locator('[class*="diagrama"]').first();
    const scrollWidth = await diagrama.evaluate((el) => el.scrollWidth);
    const clientWidth = await diagrama.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("fuera de Atención (/pacientes): la sidebar general sigue expandida", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/");
    await page.goto("/pacientes");

    const sidebar = page.getByRole("navigation", { name: "Navegación principal" });
    const anchoSidebar = (await sidebar.boundingBox())?.width;
    expect(anchoSidebar).toBeGreaterThan(150);
  });
});
