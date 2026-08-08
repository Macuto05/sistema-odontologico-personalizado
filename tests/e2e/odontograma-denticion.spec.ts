import { test, expect } from "@playwright/test";

/** Escenario 2 de specs/006-odontograma/quickstart.md — dentición Adulto/Niño (US2). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function abrirOdontograma(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Denticion");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("2015-05-05");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
}

async function expandirCategoria(page: import("@playwright/test").Page, categoria: string) {
  await page.getByRole("tab", { name: categoria, exact: true }).click();
}

test.describe("Odontograma — Dentición Adulto/Niño (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 2: la vista Niño muestra numeración distinta y Pulpotomía disponible", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0201${Date.now()}`);

    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toBeVisible();
    await page.getByRole("tab", { name: "Niño", exact: true }).click();
    await expect(page.getByRole("button", { name: "Diente 55 completo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toHaveCount(0);

    await page.getByRole("button", { name: "Diente 55 completo" }).click();
    await expandirCategoria(page, "Endodoncia");
    await expect(page.getByRole("button", { name: "Pulpotomía", exact: true })).toBeVisible();
  });

  test("Escenario 2: Pulpotomía/Pulpectomía no aparecen disponibles en la vista Adulto (FR-012)", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0202${Date.now()}`);

    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expandirCategoria(page, "Endodoncia");
    await expect(page.getByRole("button", { name: "Pulpotomía", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pulpectomía", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tratamiento de conducto" })).toBeVisible();
  });

  test("Escenario 2: cambiar de vista conserva los datos de ambas de forma independiente", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0203${Date.now()}`);

    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expandirCategoria(page, "Ausencia / Extracción");
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    await page.getByRole("tab", { name: "Niño", exact: true }).click();
    await page.getByRole("button", { name: "Diente 55 completo" }).click();
    // La selección de Adulto no debería seguir marcada acá — el catálogo vuelve a estar
    // disponible para elegir (sin "Eliminar" todavía en esta dentición/diente).
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await expandirCategoria(page, "Ausencia / Extracción");
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    await page.getByRole("tab", { name: "Adulto", exact: true }).click();
    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toBeVisible();
    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });
});
