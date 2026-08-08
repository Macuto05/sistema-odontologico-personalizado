import { test, expect } from "@playwright/test";

/**
 * Escenario 1 de quickstart.md (005-atencion-paciente) — requiere entorno real, igual que
 * editar-paciente.spec.ts. Revisión posterior: la Cita recién se crea al "Finalizar
 * atención" — "Nueva cita" solo abre un borrador, sin crear nada todavía.
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

async function crearPaciente(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Atención");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  return page.url();
}

test.describe("Atención de paciente — iniciar (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 1: 'Nueva cita' abre el panel de Atención en modo borrador", async ({ page }) => {
    await crearPaciente(page, `V9101${Date.now()}`);

    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await expect(page.getByRole("tab", { name: "Diagnóstico" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar atención" })).toBeVisible();
  });

  test("'Atender Cita' en la topbar descarta el borrador sin guardar nada", async ({ page }) => {
    const urlPaciente = await crearPaciente(page, `V9102${Date.now()}`);

    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByLabel("Motivo de consulta").fill("Esto no se debería guardar");

    // Revisión posterior (008-rediseno-visual-sistema): "Volver a la ficha" se reemplazó por
    // el breadcrumb "Atender Cita" de la topbar propia de esta pantalla, que cumple la misma
    // función de volver a la ficha del paciente.
    await page.getByRole("link", { name: "Atender Cita" }).click();
    await page.waitForURL(urlPaciente);

    // Un nuevo borrador arranca vacío — no quedó nada del anterior.
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await expect(page.getByLabel("Motivo de consulta")).toHaveValue("");
  });

  test("Escenario 1: el botón 'Nueva cita' no está disponible para un paciente archivado", async ({
    page,
  }) => {
    await crearPaciente(page, `V9103${Date.now()}`);
    await page.getByRole("button", { name: "Archivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();

    await expect(page.getByRole("button", { name: "Nueva cita" })).toBeHidden();
  });
});
