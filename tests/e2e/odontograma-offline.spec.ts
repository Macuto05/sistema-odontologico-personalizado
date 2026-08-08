import { test, expect } from "@playwright/test";

/** Escenario 8 de specs/006-odontograma/quickstart.md — funcionamiento 100% offline
 * (FR-018), sin ninguna de las excepciones de conectividad de 005-atencion-paciente. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Odontograma — Funcionamiento 100% offline (FR-018)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 8: marcar hallazgos y cargar el plan de tratamiento funciona sin conexión", async ({
    page,
    context,
  }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Offline Odonto");
    await page.getByLabel("Documento de identidad").fill(`O0801${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-11-11");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("button", { name: "Diente 21 completo" })).toBeVisible();

    await context.setOffline(true);

    await page.getByRole("button", { name: "Diente 21 completo" }).click();
    await page.getByRole("button", { name: "Ausencia / Extracción", exact: true }).click();
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    await page.getByLabel("Tratamiento ejecutado").fill("Control offline");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText("Control offline")).toBeVisible();

    // Persistencia diferida (revisión posterior): "Guardar cambios" escribe en IndexedDB
    // local, no contra el servidor — debe funcionar sin conexión igual que el resto.
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await context.setOffline(false);
  });
});
