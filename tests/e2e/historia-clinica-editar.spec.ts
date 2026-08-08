import { test, expect } from "@playwright/test";

/**
 * Escenarios 4 y 6 de quickstart.md (003-historia-clinica-paciente) — requiere entorno
 * real, igual que editar-paciente.spec.ts.
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

async function crearPacienteConHistoriaClinica(
  page: import("@playwright/test").Page,
  documento: string,
) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Historia Editable");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1992-03-03");
  await page.getByLabel("Diabetes").check();
  await agregarEtiqueta(page, "Alergias", "Penicilina");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
}

test.describe("Historia clínica — edición (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 4: edita la historia clínica de un paciente activo", async ({ page }) => {
    await crearPacienteConHistoriaClinica(page, `V9009${Date.now()}`);
    await page.getByRole("button", { name: /editar/i }).click();

    // Desmarca Diabetes, marca Artritis, cambia Alergias (quita Penicilina, agrega Ibuprofeno).
    await page.getByLabel("Diabetes").uncheck();
    await page.getByLabel("Artritis").check();
    await page.getByRole("button", { name: "Quitar Penicilina" }).click();
    await agregarEtiqueta(page, "Alergias", "Ibuprofeno");

    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(page.getByText("Artritis")).toBeVisible();
    await expect(page.getByText("Ibuprofeno")).toBeVisible();
    await expect(page.getByText("Diabetes")).not.toBeVisible();
    await expect(page.getByText("Penicilina")).not.toBeVisible();
  });

  test("Escenario 6: exige reactivar antes de editar la historia clínica de un paciente archivado", async ({
    page,
  }) => {
    await crearPacienteConHistoriaClinica(page, `V9009${Date.now()}`);
    await page.getByRole("button", { name: "Archivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();

    // Mismo comportamiento que el resto de la ficha (FR-013): sin botón Editar, exige
    // reactivar primero — la historia clínica no tiene una excepción propia a esta regla.
    await expect(page.getByRole("button", { name: /editar/i })).toBeHidden();
    await expect(page.getByText(/reactivar/i)).toBeVisible();
    // Los datos de historia clínica siguen visibles (no se pierden al archivar).
    await expect(page.getByText("Diabetes")).toBeVisible();
    await expect(page.getByText("Penicilina")).toBeVisible();
  });
});
