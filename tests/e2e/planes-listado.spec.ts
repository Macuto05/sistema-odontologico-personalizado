import { test, expect } from "@playwright/test";

/** Escenario 1 de specs/009-planes-tratamiento/quickstart.md — registro consolidado (US1,
 * FR-001 a FR-003). */

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
  await page.getByLabel("Nombre completo").fill("Paciente Planes Listado");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
}

async function guardarCambiosOdontograma(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();
}

test.describe("Planes de tratamiento — Registro consolidado (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 1: un plan guardado desde Odontograma aparece en Planes; sin guardar, no", async ({
    page,
  }) => {
    await crearPaciente(page, `P0101${Date.now()}`);

    await page.getByRole("tab", { name: "Planes" }).click();
    await expect(page.getByText("Todavía no hay planes de tratamiento registrados")).toBeVisible();

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Fecha").fill("2026-08-01");
    await page.getByLabel("Elemento dentario (opcional)").fill("16");
    await page.getByLabel("Tratamiento ejecutado").fill("Obturación");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText("Obturación")).toBeVisible();

    // Todavía en borrador — no debe verse en Planes.
    await page.getByRole("tab", { name: "Planes" }).click();
    await expect(page.getByText("Todavía no hay planes de tratamiento registrados")).toBeVisible();

    // Guardar cambios en Odontograma y recién ahí debe aparecer en Planes.
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await guardarCambiosOdontograma(page);

    await page.getByRole("tab", { name: "Planes" }).click();
    const fila = page.getByRole("row", { name: /Obturación/ });
    await expect(fila).toBeVisible();
    await expect(fila.getByText("16")).toBeVisible();
  });
});
