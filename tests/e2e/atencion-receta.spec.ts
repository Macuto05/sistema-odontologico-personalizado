import { test, expect } from "@playwright/test";

/** Escenario 2 de quickstart.md (005-atencion-paciente, parte Receta). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function iniciarAtencion(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Receta");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-03-03");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Receta" }).click();
}

test.describe("Atención de paciente — Receta (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 2: agrega y quita ítems de receta", async ({ page }) => {
    await iniciarAtencion(page, `V9301${Date.now()}`);

    await page.getByRole("button", { name: "+ Agregar medicamento" }).click();
    await page.getByLabel("Medicamento").fill("Amoxicilina");
    await page.getByLabel("Dosis").fill("500mg");
    await page.getByLabel("Frecuencia").fill("cada 8 horas");
    await page.getByLabel("Duración").fill("7 días");
    await page.getByRole("button", { name: /agregar medicamento/i }).click();

    await expect(page.getByText("Amoxicilina")).toBeVisible();

    await page.getByRole("button", { name: "+ Agregar medicamento" }).click();
    await page.getByLabel("Medicamento").fill("Ibuprofeno");
    await page.getByLabel("Dosis").fill("400mg");
    await page.getByLabel("Frecuencia").fill("cada 12 horas");
    await page.getByLabel("Duración").fill("5 días");
    await page.getByRole("button", { name: /agregar medicamento/i }).click();

    await expect(page.getByText("Ibuprofeno")).toBeVisible();

    await page
      .getByRole("row")
      .filter({ hasText: "Amoxicilina" })
      .getByRole("button", { name: /quitar/i })
      .click();

    await expect(page.getByText("Amoxicilina")).not.toBeVisible();
    await expect(page.getByText("Ibuprofeno")).toBeVisible();
  });

  test("Escenario 2: permite dejar la receta vacía", async ({ page }) => {
    await iniciarAtencion(page, `V9302${Date.now()}`);
    await expect(page.getByText(/sin medicamentos/i)).toBeVisible();
  });
});
