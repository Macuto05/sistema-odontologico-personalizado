import { test, expect, type Page } from "@playwright/test";

/**
 * Verificación de responsive de las pantallas de Insumos en los tres breakpoints de
 * `docs/design-system.md` §4.0 (010-gestion-insumos, T055, Principio VI). El criterio duro
 * del principio es que ninguna pantalla obligue a scroll horizontal para su contenido
 * principal, en ninguno de los tres tamaños.
 */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

const BREAKPOINTS = [
  { nombre: "celular", width: 375, height: 800 },
  { nombre: "tablet", width: 834, height: 1112 },
  { nombre: "escritorio", width: 1440, height: 900 },
] as const;

async function iniciarSesion(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

/** El <body> no debe desbordar horizontalmente el viewport (§4.0, Principio VI). */
async function sinScrollHorizontal(page: Page) {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(desborda, "la página no debe requerir scroll horizontal").toBe(false);
}

test.describe("Insumos — responsive (§4.0)", () => {
  for (const bp of BREAKPOINTS) {
    test(`listado sin scroll horizontal en ${bp.nombre} (${bp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await iniciarSesion(page);

      await page.goto("/insumos");
      await expect(page.getByRole("heading", { name: /Insumos/ })).toBeVisible();
      await sinScrollHorizontal(page);
    });

    test(`formulario de alta sin scroll horizontal en ${bp.nombre} (${bp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await iniciarSesion(page);

      await page.goto("/insumos/nuevo");
      await expect(page.getByRole("heading", { name: "Nuevo insumo" })).toBeVisible();
      await expect(page.locator("#nombre")).toBeVisible();
      await sinScrollHorizontal(page);
    });
  }

  test("en celular la tabla se reordena como tarjetas, sin encabezado de columnas", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await iniciarSesion(page);

    // Un insumo cualquiera, para que haya al menos una fila que inspeccionar.
    await page.goto("/insumos/nuevo");
    await page.locator("#nombre").fill(`Insumo Responsive ${Date.now()}`);
    await page.locator("#stockActual").fill("7");
    await page.locator("#stockMinimo").fill("2");
    await page.getByRole("button", { name: /crear insumo|creando/i }).click();
    await page.waitForURL(/\/insumos$/);

    // El thead se oculta en <640px (insumos.module.css) — cada celda lleva su propia
    // etiqueta vía `data-columna`, así que la tabla sigue siendo legible sin encabezado.
    await expect(page.locator("thead")).toBeHidden();
    await sinScrollHorizontal(page);
  });
});
