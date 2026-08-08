import { test, expect } from "@playwright/test";

/** Escenario 3 de quickstart.md — requiere entorno real, igual que alta-paciente.spec.ts. */

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
  await page.getByLabel("Nombre completo").fill("Paciente Editable");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1992-03-03");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  // Con conexión, crear salta directo a la ficha del paciente recién creado.
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
}

test.describe("Edición de paciente (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("edita teléfono/email/dirección y persiste", async ({ page }) => {
    await crearPaciente(page, `V9009${Date.now()}`);
    await page.getByRole("button", { name: /editar/i }).click();
    await page.getByLabel("Teléfono").fill("099123456");
    await page.getByRole("button", { name: /guardar/i }).click();
    await expect(page.getByText("099123456")).toBeVisible();
  });

  test("rechaza cambiar el documento a uno ya usado por otro paciente", async ({ page }) => {
    const docExistente = `V9009${Date.now()}`;
    await crearPaciente(page, docExistente);
    await crearPaciente(page, `V9009${Date.now()}`);

    await page.getByRole("button", { name: /editar/i }).click();
    await page.getByLabel("Documento de identidad").fill(docExistente);
    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(page.getByRole("alert").filter({ hasText: /ya existe/i })).toBeVisible();
  });

  test("exige reactivar antes de editar un paciente archivado", async ({ page }) => {
    await crearPaciente(page, `V9009${Date.now()}`);
    await page.getByRole("button", { name: "Archivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByRole("button", { name: /editar/i })).toBeHidden();
    await expect(page.getByText(/reactivar/i)).toBeVisible();
  });
});
