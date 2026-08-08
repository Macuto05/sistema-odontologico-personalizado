import { test, expect } from "@playwright/test";

/**
 * Escenario 4 de quickstart.md (005-atencion-paciente). Revisión posterior: "Finalizar
 * atención" ahora es la única acción que crea y guarda la Cita — antes de presionarla, no
 * existe ningún registro que "bloquear".
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
  await page.getByLabel("Nombre completo").fill("Paciente Finalizar");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-06-06");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  const urlPaciente = page.url();
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  return urlPaciente;
}

test.describe("Atención de paciente — Finalizar (US6)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 4: finalizar crea la cita, la guarda completa y vuelve a la ficha", async ({
    page,
  }) => {
    const urlPaciente = await iniciarAtencion(page, `V9601${Date.now()}`);

    await page.getByLabel("Motivo de consulta").fill("Control");
    await page.getByLabel("Diagnóstico").fill("Sin hallazgos");

    await page.getByRole("button", { name: "Finalizar atención" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar atención" }).click();

    // Vuelve a la ficha del paciente — ya no hay nada que "bloquear" en este panel.
    await page.waitForURL(urlPaciente);

    // Queda visible, completa y de solo lectura, en el Historial de una atención nueva.
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
    await page.getByRole("button", { name: "Historial de citas anteriores", exact: true }).click();
    const seccionHistorial = page.locator("#accordion-panel-historial");
    await seccionHistorial.getByRole("button", { name: /Sin hallazgos/ }).click();
    await expect(seccionHistorial.getByText("Control")).toBeVisible();
    // El detalle del historial es de solo lectura — no hay ningún campo editable ahí.
    await expect(seccionHistorial.locator("textarea")).toHaveCount(0);
  });

  test("Escenario 4: permite finalizar una atención sin ningún dato cargado", async ({ page }) => {
    const urlPaciente = await iniciarAtencion(page, `V9602${Date.now()}`);

    await page.getByRole("button", { name: "Finalizar atención" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar atención" }).click();

    await page.waitForURL(urlPaciente);
  });
});
