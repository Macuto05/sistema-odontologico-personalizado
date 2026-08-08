import { test, expect } from "@playwright/test";

/**
 * Escenario 1 de quickstart.md (004-consultorios) — requiere: servidor corriendo
 * (npm run build && npm run start), PostgreSQL con la migración de Consultorio aplicada,
 * y la cuenta sembrada por prisma/seed.ts.
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

test.describe("Administrar consultorios desde Configuración (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
  });

  test("agrega un consultorio nuevo y aparece en la lista (FR-001)", async ({ page }) => {
    const nombre = `Sede E2E ${Date.now()}`;
    await page.getByLabel("Nombre del consultorio").fill(nombre);
    await page.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(page.getByText(nombre)).toBeVisible();
  });

  test("rechaza un nombre duplicado, insensible a mayúsculas (FR-003)", async ({ page }) => {
    const nombre = `Sede Dup E2E ${Date.now()}`;
    await page.getByLabel("Nombre del consultorio").fill(nombre);
    await page.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(page.getByText(nombre)).toBeVisible();

    await page.getByLabel("Nombre del consultorio").fill(nombre.toLowerCase());
    await page.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(page.getByText(/ya existe/i)).toBeVisible();
  });

  test("elimina un consultorio existente y desaparece de la lista (FR-004)", async ({ page }) => {
    const nombre = `Sede Baja E2E ${Date.now()}`;
    await page.getByLabel("Nombre del consultorio").fill(nombre);
    await page.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(page.getByText(nombre)).toBeVisible();

    await page.getByRole("button", { name: `Eliminar ${nombre}` }).click();
    await expect(page.getByText(nombre)).not.toBeVisible();
  });
});
