import { test, expect } from "@playwright/test";

/**
 * Escenario 2 de quickstart.md (005-atencion-paciente, parte Diagnóstico). Revisión
 * posterior: el diagnóstico vive en el borrador hasta "Finalizar atención" — se verifica
 * que quedó guardado a través del Historial de citas anteriores, no recargando la página
 * (recargar antes de finalizar pierde el borrador a propósito).
 *
 * 006-odontograma, FR-017: el campo "Plan de tratamiento" que vivía en esta pestaña se
 * eliminó — su función se trasladó a la tabla estructurada del tab Odontograma.
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

async function iniciarAtencion(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Diagnóstico");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-02-02");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  const urlPaciente = page.url();
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  return urlPaciente;
}

async function finalizar(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Finalizar atención" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Finalizar atención" }).click();
}

test.describe("Atención de paciente — Diagnóstico (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 2: completa motivo, diagnóstico y categoría, y quedan guardados al finalizar", async ({
    page,
  }) => {
    const urlPaciente = await iniciarAtencion(page, `V9201${Date.now()}`);

    await page.getByLabel("Motivo de consulta").fill("Dolor en molar inferior");
    await page.getByLabel("Diagnóstico").fill("Caries profunda");
    await page.getByLabel("Categoría").selectOption("URGENCIA");
    await finalizar(page);

    await page.waitForURL(urlPaciente);

    // Se ve en el Historial de citas anteriores de una atención nueva.
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
    await page.getByRole("button", { name: "Historial de citas anteriores", exact: true }).click();
    const entrada = page.getByRole("button", { name: /Caries profunda/ });
    await entrada.click();
    await expect(page.getByText("Dolor en molar inferior")).toBeVisible();
  });

  test("Escenario 2: permite finalizar con todos los campos vacíos", async ({ page }) => {
    await iniciarAtencion(page, `V9202${Date.now()}`);
    await finalizar(page);
    await expect(page.getByText(/error/i)).not.toBeVisible();
  });
});
