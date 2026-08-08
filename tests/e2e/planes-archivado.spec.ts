import { test, expect } from "@playwright/test";

/** Verificación de FR-012 de specs/009-planes-tratamiento/spec.md — paciente archivado: el
 * checkbox y la nota se ven pero no son editables en la pestaña Planes. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Planes de tratamiento — paciente archivado (FR-012)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("checkbox y nota se ven pero no son editables", async ({ page }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Planes Archivado");
    await page.getByLabel("Documento de identidad").fill(`P0601${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    const urlPaciente = page.url();

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Fecha").fill("2026-08-01");
    await page.getByLabel("Tratamiento ejecutado").fill("Corona");
    await page.getByRole("button", { name: "Agregar" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.goto(urlPaciente);
    await page.getByRole("button", { name: "Archivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Planes" }).click();
    const fila = page.getByRole("row", { name: /Corona/ });
    await expect(fila).toBeVisible();
    await expect(fila.getByRole("checkbox", { name: "Realizado" })).toBeDisabled();
    await expect(fila.getByRole("textbox", { name: "Nota de Corona" })).toBeDisabled();
  });
});
