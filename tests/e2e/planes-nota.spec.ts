import { test, expect } from "@playwright/test";

/** Escenario 4 de specs/009-planes-tratamiento/quickstart.md — nota libre (US4, FR-008). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Planes de tratamiento — Nota (US4)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 4: guarda al perder foco, persiste, y se puede editar", async ({ page }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Planes Nota");
    await page.getByLabel("Documento de identidad").fill(`P0401${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Fecha").fill("2026-08-01");
    await page.getByLabel("Tratamiento ejecutado").fill("Endodoncia");
    await page.getByRole("button", { name: "Agregar" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.getByRole("tab", { name: "Planes" }).click();
    const notaInput = page.getByRole("textbox", { name: "Nota de Endodoncia" });
    await notaInput.fill("Paciente sensible al frío");
    await page.keyboard.press("Tab");

    await page.reload();
    await page.getByRole("tab", { name: "Planes" }).click();
    await expect(page.getByRole("textbox", { name: "Nota de Endodoncia" })).toHaveValue(
      "Paciente sensible al frío",
    );

    await page.getByRole("textbox", { name: "Nota de Endodoncia" }).fill("Sin sensibilidad ahora");
    await page.keyboard.press("Tab");
    await page.reload();
    await page.getByRole("tab", { name: "Planes" }).click();
    await expect(page.getByRole("textbox", { name: "Nota de Endodoncia" })).toHaveValue(
      "Sin sensibilidad ahora",
    );
  });
});
