import { test, expect } from "@playwright/test";

/** Escenario 6 de specs/006-odontograma/quickstart.md — leyenda de símbolos (US6). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Odontograma — Leyenda de símbolos (US6)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 6: la leyenda lista las 8 categorías con sus condiciones", async ({ page }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Leyenda");
    await page.getByLabel("Documento de identidad").fill(`O0601${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-09-09");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByRole("tab", { name: "Odontograma" }).click();

    await page.getByRole("button", { name: "Ver leyenda" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("Ausencia / Extracción")).toBeVisible();
    await expect(dialogo.getByText("Ortodoncia")).toBeVisible();

    await dialogo.getByRole("button", { name: "Patología" }).click();
    await expect(dialogo.getByText("Caries")).toBeVisible();
  });
});
