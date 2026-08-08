import { test, expect } from "@playwright/test";

/**
 * quickstart.md (007-tema-apariencia). Corre en serie: todos los tests mutan la preferencia
 * de tema de la misma cuenta única sembrada, y cada uno la deja en "azul" al terminar para
 * no afectar a otros specs (ej. capturas de otras pantallas).
 */
test.describe.configure({ mode: "serial" });

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

function colorPrimarioActivo(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
  );
}

test.describe("Apariencia: tema azul/morado (007-tema-apariencia)", () => {
  test.afterEach(async ({ page }) => {
    // Vuelve al tema azul (predeterminado) para no dejar la cuenta compartida en morado —
    // algunos tests terminan en una pantalla distinta de Configuración.
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Tema Azul" }).click();
  });

  test("elegir morado se aplica al instante y persiste al navegar (Escenario 1, FR-001, FR-002)", async ({
    page,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");

    const colorAntes = await colorPrimarioActivo(page);
    await page.getByRole("button", { name: "Tema Morado" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");
    const colorDespues = await colorPrimarioActivo(page);
    expect(colorDespues).not.toBe(colorAntes);

    // Se mantiene fuera de Configuración, no solo en esa pantalla.
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");
  });

  test("las alertas de éxito/error conservan su color con el tema morado activo (Escenario 2, FR-006)", async ({
    page,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Tema Morado" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");

    await page.getByLabel("Contraseña actual").fill("esto-no-es-correcto");
    await page.getByLabel("Contraseña nueva").fill("otraNuevaSegura123");
    await page.getByRole("button", { name: /cambiar contraseña/i }).click();

    const alerta = page.getByText(/incorrecta/i);
    await expect(alerta).toBeVisible({ timeout: 15_000 });
    const colorError = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-error").trim(),
    );
    // --color-error no está en la lista de tokens que reasigna [data-theme="morado"].
    expect(colorError).toBe("#dc2626");
  });

  test("la preferencia persiste tras recargar y no viaja a un contexto de navegador distinto (Escenario 3, FR-004, FR-005)", async ({
    page,
    browser,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Tema Morado" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");

    const contextoNuevo = await browser.newContext();
    const paginaNueva = await contextoNuevo.newPage();
    await iniciarSesion(paginaNueva);
    const temaEnContextoNuevo = await paginaNueva.locator("html").getAttribute("data-theme");
    expect(temaEnContextoNuevo === null || temaEnContextoNuevo === "azul").toBe(true);
    await contextoNuevo.close();
  });

  test("el swatch activo se distingue visualmente y la marca se mueve al cambiar (Escenario 4, FR-007)", async ({
    page,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");

    const swatchAzul = page.getByRole("button", { name: "Tema Azul" });
    const swatchMorado = page.getByRole("button", { name: "Tema Morado" });

    await expect(swatchAzul).toHaveAttribute("aria-pressed", "true");
    await expect(swatchMorado).toHaveAttribute("aria-pressed", "false");

    await swatchMorado.click();

    await expect(swatchMorado).toHaveAttribute("aria-pressed", "true");
    await expect(swatchAzul).toHaveAttribute("aria-pressed", "false");
  });

  test("la sección Apariencia no genera scroll horizontal en los tres breakpoints (§4.0, Principio VI)", async ({
    page,
  }) => {
    await iniciarSesion(page);

    for (const viewport of [
      { width: 375, height: 800 }, // celular
      { width: 768, height: 1024 }, // tablet
      { width: 1440, height: 900 }, // escritorio
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/configuracion");
      await expect(page.getByRole("heading", { name: "Apariencia" })).toBeVisible();

      const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
      const anchoVentana = await page.evaluate(() => window.innerWidth);
      expect(anchoDocumento).toBeLessThanOrEqual(anchoVentana + 1);
    }
  });

  test("el ítem activo de la Sidebar y la pestaña activa de Tabs también tiñen su fondo de morado (§3.2.1, fix post-lanzamiento)", async ({
    page,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Tema Morado" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");

    await page.goto("/pacientes");

    const itemActivo = page.getByRole("link", { name: "Pacientes", exact: true });
    await expect(itemActivo).toHaveAttribute("aria-current", "page");
    const coloresSidebar = await itemActivo.evaluate((el) => {
      const estilo = getComputedStyle(el);
      return { color: estilo.color, backgroundColor: estilo.backgroundColor };
    });
    // purple-700 = rgb(109, 40, 217); purple-50 = rgb(245, 243, 255) — ambos ahora siguen
    // el tema (antes el fondo quedaba fijo en cyan-50, rgb(236, 254, 255)).
    expect(coloresSidebar.color).toBe("rgb(109, 40, 217)");
    expect(coloresSidebar.backgroundColor).toBe("rgb(245, 243, 255)");

    const tabActivos = page.getByRole("tab", { name: "Activos" });
    const coloresTab = await tabActivos.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(coloresTab).toBe("rgb(245, 243, 255)");
  });

  test("el avatar de iniciales de los pacientes nunca queda azul con el tema morado activo (§6.9, fix post-lanzamiento)", async ({
    page,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Tema Morado" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "morado");

    await page.goto("/pacientes");
    await page.waitForSelector("table tbody tr");
    const coloresAvatar = await page.evaluate(() =>
      Array.from(document.querySelectorAll("table tbody span[aria-hidden='true']")).map(
        (el) => getComputedStyle(el).backgroundColor,
      ),
    );
    expect(coloresAvatar.length).toBeGreaterThan(0);
    // cyan-700 = rgb(14, 116, 144); cyan-900 = rgb(22, 78, 99) — ninguno debería aparecer
    // con el tema morado activo (antes, 2 de los 5 tonos rotativos quedaban fijos en azul).
    expect(coloresAvatar).not.toContain("rgb(14, 116, 144)");
    expect(coloresAvatar).not.toContain("rgb(22, 78, 99)");
  });
});
