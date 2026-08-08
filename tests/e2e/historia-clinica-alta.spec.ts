import { test, expect } from "@playwright/test";

/**
 * Escenarios 1-3 de quickstart.md (003-historia-clinica-paciente) — requiere: servidor
 * corriendo (npm run dev), PostgreSQL con migraciones aplicadas, y la cuenta sembrada por
 * prisma/seed.ts. Mismas variables de entorno que alta-paciente.spec.ts.
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

/** Revisión posterior (008-rediseno-visual-sistema): los campos de historia clínica que
 * eran texto libre pasaron a `EditorEtiquetas` — "Añadir" abre un campo in situ, Enter
 * confirma la etiqueta. */
async function agregarEtiqueta(page: import("@playwright/test").Page, label: string, texto: string) {
  await page.getByRole("button", { name: `Añadir a ${label}` }).click();
  await page.getByLabel(label).fill(texto);
  await page.getByLabel(label).press("Enter");
}

test.describe("Historia clínica — alta de paciente (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 1: alta con historia clínica completa, incluido 'Otros'", async ({ page }) => {
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Historia Clínica");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1988-03-03");

    await page.getByLabel("Diabetes").check();
    await page.getByLabel("Hipertensión/Hipotensión").check();
    await page.getByLabel("Otros").check();
    await agregarEtiqueta(page, "Otros antecedentes", "Fractura de cadera en 2020");
    await agregarEtiqueta(page, "Antecedentes heredofamiliares", "Madre con hipertensión");
    await agregarEtiqueta(page, "Medicamentos actuales", "Metformina 850mg");
    await agregarEtiqueta(page, "Alergias", "Penicilina");

    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await expect(page.getByText("Diabetes")).toBeVisible();
    await expect(page.getByText("Hipertensión/Hipotensión")).toBeVisible();
    await expect(page.getByText("Fractura de cadera en 2020")).toBeVisible();
    await expect(page.getByText("Madre con hipertensión")).toBeVisible();
    await expect(page.getByText("Metformina 850mg")).toBeVisible();
    await expect(page.getByText("Penicilina")).toBeVisible();
  });

  test("Escenario 2: alta sin completar historia clínica (FR-009)", async ({ page }) => {
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Sin Historia");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1992-07-07");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();

    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Sin historia clínica registrada")).toBeVisible();
  });

  test("Escenario 3: 'Otros' marcado y luego desmarcado antes de guardar (edge case)", async ({
    page,
  }) => {
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Otros Descartado");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1993-08-08");

    await page.getByLabel("Otros", { exact: true }).check();
    await agregarEtiqueta(page, "Otros antecedentes", "Texto que no debe guardarse");
    await page.getByLabel("Otros", { exact: true }).uncheck();
    await expect(page.getByText("Texto que no debe guardarse")).toBeHidden();

    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await expect(page.getByText("Texto que no debe guardarse")).not.toBeVisible();
    await expect(page.getByText("Sin historia clínica registrada")).toBeVisible();
  });
});
