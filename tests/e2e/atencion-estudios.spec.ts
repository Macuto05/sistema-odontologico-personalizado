import { test, expect } from "@playwright/test";

/** Escenario 2 de quickstart.md (005-atencion-paciente, parte Estudios). */

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
  await page.getByLabel("Nombre completo").fill("Paciente Estudios");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-04-04");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Estudios" }).click();
}

test.describe("Atención de paciente — Estudios complementarios (US4)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 2: agrega y quita estudios solicitados", async ({ page }) => {
    await iniciarAtencion(page, `V9401${Date.now()}`);

    await page.getByRole("button", { name: "+ Agregar estudio" }).click();
    await page.getByLabel("Estudio solicitado").fill("Radiografía panorámica");
    await page.getByRole("button", { name: /agregar estudio/i }).click();
    await expect(page.getByText("Radiografía panorámica")).toBeVisible();

    await page.getByRole("button", { name: "+ Agregar estudio" }).click();
    await page.getByLabel("Estudio solicitado").fill("Hemograma completo");
    await page.getByRole("button", { name: /agregar estudio/i }).click();
    await expect(page.getByText("Hemograma completo")).toBeVisible();

    await page
      .getByRole("row")
      .filter({ hasText: "Radiografía panorámica" })
      .getByRole("button", { name: /quitar/i })
      .click();

    await expect(page.getByText("Radiografía panorámica")).not.toBeVisible();
    await expect(page.getByText("Hemograma completo")).toBeVisible();
  });

  test("Escenario 2: permite dejar los estudios vacíos", async ({ page }) => {
    await iniciarAtencion(page, `V9402${Date.now()}`);
    await expect(page.getByText(/sin estudios/i)).toBeVisible();
  });
});
