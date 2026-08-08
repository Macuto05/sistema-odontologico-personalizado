import { test, expect } from "@playwright/test";

/** Escenario 3 de specs/006-odontograma/quickstart.md — corregir un hallazgo (US3). */

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
  await page.getByLabel("Nombre completo").fill("Paciente Corregir");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-06");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
}

async function expandirCategoria(page: import("@playwright/test").Page, categoria: string) {
  await page.getByRole("tab", { name: categoria, exact: true }).click();
}

test.describe("Odontograma — Corregir un hallazgo (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 3: cambiar el estado de un hallazgo de pendiente a realizado", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0301${Date.now()}`);

    await page
      .getByRole("button", { name: "Diente 26, superficie oclusal/incisal" })
      .click();
    await expandirCategoria(page, "Restauraciones");
    await page.getByRole("button", { name: "Sellante", exact: true }).click();
    await expect(page.getByRole("button", { name: "Marcar realizado" })).toBeVisible();

    await page.getByRole("button", { name: "Marcar realizado" }).click();
    await expect(page.getByRole("button", { name: "Marcar pendiente" })).toBeVisible();
  });

  test("Escenario 3: eliminar un hallazgo lo quita de la selección", async ({ page }) => {
    await abrirOdontograma(page, `O0302${Date.now()}`);

    await page.getByRole("button", { name: "Diente 31 completo" }).click();
    await expandirCategoria(page, "Ausencia / Extracción");
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    await page.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  });

  test("Escenario 3: agregar otro hallazgo sin reemplazar el existente (FR-020)", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0303${Date.now()}`);

    await page
      .getByRole("button", { name: "Diente 46, superficie oclusal/incisal" })
      .click();
    await expandirCategoria(page, "Patología");
    await page.getByRole("button", { name: "Caries", exact: true }).click();
    await expandirCategoria(page, "Restauraciones");
    await page.getByRole("button", { name: "Restauración / Obturación", exact: true }).click();

    // Ambos hallazgos coexisten — dos filas con acción "Eliminar" en la selección actual.
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(2);
  });
});
