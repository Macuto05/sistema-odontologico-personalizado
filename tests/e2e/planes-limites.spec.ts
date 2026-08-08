import { test, expect } from "@playwright/test";

/** Verificación de FR-010/FR-011 de specs/009-planes-tratamiento/spec.md — desde Planes no
 * se puede editar fecha/diente/tratamiento ni eliminar; el tab Odontograma sigue exactamente
 * igual que antes de esta feature. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Planes de tratamiento — límites de edición (FR-010, FR-011)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Planes no ofrece editar fecha/diente/tratamiento ni eliminar; Odontograma sigue igual", async ({
    page,
  }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Planes Limites");
    await page.getByLabel("Documento de identidad").fill(`P0501${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    // El tab Odontograma sigue teniendo su propio Editar/Eliminar en la tabla de origen.
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Fecha").fill("2026-08-01");
    await page.getByLabel("Elemento dentario (opcional)").fill("21");
    await page.getByLabel("Tratamiento ejecutado").fill("Carilla");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByRole("button", { name: "Editar" }).last()).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.getByRole("tab", { name: "Planes" }).click();
    const fila = page.getByRole("row", { name: /Carilla/ });
    await expect(fila).toBeVisible();

    // Ni edición completa ni eliminación disponibles desde Planes para esa fila.
    await expect(fila.getByRole("button", { name: "Editar" })).toHaveCount(0);
    await expect(fila.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    // Único campo de texto editable de la fila: la nota — fecha/diente/tratamiento son
    // texto plano, no inputs.
    await expect(fila.getByRole("textbox")).toHaveCount(1);
    await expect(fila.getByRole("checkbox", { name: "Realizado" })).toBeVisible();
    await expect(fila.getByRole("textbox", { name: "Nota de Carilla" })).toBeVisible();
  });
});
