import { test, expect } from "@playwright/test";

/** Escenario 3 de quickstart.md (005-atencion-paciente). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

/** Revisión posterior (008-rediseno-visual-sistema): los campos de historia clínica que
 * eran texto libre pasaron a `EditorEtiquetas` — "Añadir" abre un campo in situ, Enter
 * confirma la etiqueta. */
async function agregarEtiqueta(page: import("@playwright/test").Page, label: string, texto: string) {
  await page.getByRole("button", { name: `Añadir a ${label}` }).click();
  await page.getByLabel(label).fill(texto);
  await page.getByLabel(label).press("Enter");
}

async function iniciarAtencionConHistoriaClinica(
  page: import("@playwright/test").Page,
  documento: string,
) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Antecedentes");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-05-05");
  await page.getByLabel("Diabetes").check();
  await agregarEtiqueta(page, "Alergias", "Penicilina");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  const urlPaciente = page.url();
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  return urlPaciente;
}

test.describe("Atención de paciente — Antecedentes (US5)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 3: ve y edita los antecedentes sin perder lo cargado en el borrador de Diagnóstico", async ({
    page,
  }) => {
    const urlPaciente = await iniciarAtencionConHistoriaClinica(page, `V9501${Date.now()}`);

    await page.getByLabel("Motivo de consulta").fill("Control de rutina");

    await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
    // Revisión posterior (008-rediseno-visual-sistema): ambas secciones del modal arrancan
    // colapsadas — antes "Antecedentes" venía expandida por defecto.
    await page.getByRole("button", { name: "Antecedentes", exact: true }).click();
    await expect(page.getByLabel("Diabetes")).toBeChecked();

    await page.getByLabel("Artritis").check();
    await agregarEtiqueta(page, "Alergias", "Ibuprofeno");
    await page.getByRole("button", { name: /guardar antecedentes/i }).click();
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();

    // Diagnóstico sigue intacto tras editar antecedentes.
    await page.getByRole("tab", { name: "Diagnóstico" }).click();
    await expect(page.getByLabel("Motivo de consulta")).toHaveValue("Control de rutina");

    // El cambio se refleja también en la ficha del paciente (no es un dato aparte).
    await page.goto(urlPaciente);
    await expect(page.getByText("Artritis")).toBeVisible();
    await expect(page.getByText("Ibuprofeno")).toBeVisible();
  });
});
