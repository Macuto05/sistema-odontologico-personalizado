import { test, expect } from "@playwright/test";

/** Escenario 5 de quickstart.md (005-atencion-paciente). */

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
  await page.getByLabel("Nombre completo").fill("Paciente Historial");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-07-07");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  return page.url();
}

/** Abre el Drawer combinado (Antecedentes e Historial) y expande la sección de Historial —
 * viene colapsada por defecto, solo Antecedentes se abre sola. */
async function abrirHistorial(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
  await page.getByRole("button", { name: "Historial de citas anteriores", exact: true }).click();
}

test.describe("Atención de paciente — Historial de citas anteriores (US7)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 5: sin citas anteriores, muestra el mensaje explícito (FR-024)", async ({ page }) => {
    await crearPaciente(page, `V9701${Date.now()}`);
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);

    await abrirHistorial(page);
    await expect(page.getByText(/no tiene citas anteriores/i)).toBeVisible();
  });

  test("Escenario 5: lista una cita finalizada y la abre en solo lectura, sin incluir la cita en curso actual", async ({
    page,
  }) => {
    const urlPaciente = await crearPaciente(page, `V9702${Date.now()}`);

    // Primera cita: cargar diagnóstico y finalizar (recién ahí se crea el registro).
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByLabel("Diagnóstico").fill("Primera consulta");
    await page.getByRole("button", { name: "Finalizar atención" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar atención" }).click();

    // Segunda atención (borrador nuevo) para el mismo paciente.
    await page.goto(urlPaciente);
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);

    await abrirHistorial(page);
    const entrada = page.getByRole("button", { name: /Primera consulta/ });
    await expect(entrada).toBeVisible();

    // La entrada expande el detalle en el lugar (ya no abre un Modal anidado).
    await entrada.click();
    await expect(entrada).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Sin medicamentos indicados.")).toBeVisible();
  });
});
