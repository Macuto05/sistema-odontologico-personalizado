import { test, expect } from "@playwright/test";

/**
 * Escenario 5 de quickstart.md (003-historia-clinica-paciente) — un paciente sin historia
 * clínica cargada (equivalente a uno creado antes de esta feature, ya que la migración es
 * aditiva con defaults) debe mostrar la sección vacía en su ficha, sin error, al visitarla
 * directamente (no solo justo después de crearlo).
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

test.describe("Historia clínica — ficha vacía (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 5: paciente sin historia clínica muestra la sección vacía, sin error", async ({
    page,
  }) => {
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Sin Migrar");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1980-01-01");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    const url = page.url();

    // Visita directa a la ficha (no el salto inmediato tras crear) — simula abrir la ficha
    // de un paciente ya existente en una sesión nueva.
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Paciente Sin Migrar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Historia clínica" })).toBeVisible();
    await expect(page.getByText("Sin historia clínica registrada")).toBeVisible();
  });
});
