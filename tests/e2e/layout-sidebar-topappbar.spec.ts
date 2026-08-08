import { test, expect } from "@playwright/test";

/** 008-rediseno-visual-sistema, US1 — verifica que TopAppBar y el contenido principal de
 * Pacientes se mantienen sincronizados con el colapso/expansión de la Sidebar, sin el
 * espacio en blanco que dejaba el bug de margin-left duplicado + TopAppBar desincronizado. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Layout compartido — Sidebar/TopAppBar sincronizados (008)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("TopAppBar y el contenido comparten el mismo borde izquierdo en todo estado de la sidebar", async ({
    page,
  }) => {
    await page.goto("/pacientes");

    const topAppBar = page.locator("header").first();
    const tablaContenedor = page.locator("table").first();
    // El aria-label alterna entre "Colapsar navegación"/"Expandir navegación" según el
    // estado — se matchea cualquiera de los dos, es el mismo botón en ambos casos.
    const botonToggle = page.getByRole("button", { name: /colapsar navegación|expandir navegación/i });

    // Estado expandido (por defecto en escritorio).
    const leftExpandidoBar = await topAppBar.evaluate((el) => el.getBoundingClientRect().left);
    const leftExpandidoTabla = await tablaContenedor.evaluate(
      (el) => el.getBoundingClientRect().left,
    );
    expect(leftExpandidoBar).toBeCloseTo(256, 0);
    // La tabla vive dentro de paddings/márgenes propios de la página — se verifica que no
    // haya un desplazamiento extra de otros 256px (el bug reportado), no una coincidencia
    // exacta de píxel con TopAppBar.
    expect(leftExpandidoTabla).toBeLessThan(leftExpandidoBar + 200);

    // Colapsar.
    await botonToggle.click();
    await page.waitForTimeout(300); // deja terminar la transición de 200ms

    const leftColapsadoBar = await topAppBar.evaluate((el) => el.getBoundingClientRect().left);
    expect(leftColapsadoBar).toBeCloseTo(64, 0);
    expect(leftColapsadoBar).toBeLessThan(leftExpandidoBar);

    const leftColapsadoTabla = await tablaContenedor.evaluate(
      (el) => el.getBoundingClientRect().left,
    );
    expect(leftColapsadoTabla).toBeLessThan(leftExpandidoTabla);

    // Expandir de nuevo — vuelve exactamente al mismo estado inicial.
    await botonToggle.click();
    await page.waitForTimeout(300);

    const leftReexpandidoBar = await topAppBar.evaluate(
      (el) => el.getBoundingClientRect().left,
    );
    expect(leftReexpandidoBar).toBeCloseTo(leftExpandidoBar, 0);
  });
});
