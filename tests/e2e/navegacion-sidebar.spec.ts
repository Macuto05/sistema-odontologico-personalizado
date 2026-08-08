import { test, expect } from "@playwright/test";

/**
 * Escenario 2 de quickstart.md (002-pantalla-inicio) — mismos prerrequisitos que
 * inicio-resumen.spec.ts.
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

test.describe("Navegación por la sidebar (US2)", () => {
  test("Pacientes lleva a la gestión de pacientes existente (FR-005)", async ({ page }) => {
    await iniciarSesion(page);
    await page.getByRole("link", { name: "Pacientes" }).click();
    await page.waitForURL("**/pacientes");
    await expect(page.getByRole("heading", { name: "Pacientes" })).toBeVisible();
  });

  test("Insumos muestra el placeholder, sin funcionalidad real (FR-006)", async ({ page }) => {
    await iniciarSesion(page);
    await page.getByRole("link", { name: "Insumos" }).click();
    await page.waitForURL("**/insumos");
    await expect(page.getByText(/próximamente/i)).toBeVisible();
  });

  test("Cerrar sesión desde el inicio termina la sesión (FR-007)", async ({ page }) => {
    await iniciarSesion(page);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/login");
  });

  test("Cerrar sesión desde Pacientes también termina la sesión (FR-007)", async ({ page }) => {
    await iniciarSesion(page);
    await page.getByRole("link", { name: "Pacientes" }).click();
    await page.waitForURL("**/pacientes");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/login");
  });

  test("acceso directo por URL sin sesión redirige a login (FR-008)", async ({ page }) => {
    await page.context().clearCookies();
    for (const ruta of ["/", "/configuracion", "/insumos"]) {
      await page.goto(ruta);
      await page.waitForURL("**/login");
    }
  });
});
