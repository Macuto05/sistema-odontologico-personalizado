import { test, expect } from "@playwright/test";

/** Escenario 2 de specs/009-planes-tratamiento/quickstart.md — marcar como realizado (US2,
 * FR-004 a FR-007). El checkbox y la fecha de realización se guardan de inmediato, sin
 * pasar por "Guardar cambios" (ese botón es del tab Odontograma, no de Planes). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function crearPacienteConPlan(
  page: import("@playwright/test").Page,
  documento: string,
  tratamiento: string,
) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Planes Realizado");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

  await page.getByRole("tab", { name: "Odontograma" }).click();
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Fecha").fill("2026-08-01");
  await page.getByLabel("Tratamiento ejecutado").fill(tratamiento);
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

  await page.getByRole("tab", { name: "Planes" }).click();
}

test.describe("Planes de tratamiento — Marcar como realizado (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 2: tildar completa la fecha de hoy de inmediato; destildar la vacía", async ({
    page,
  }) => {
    await crearPacienteConPlan(page, `P0201${Date.now()}`, "Limpieza dental");

    const fila = page.getByRole("row", { name: /Limpieza dental/ });
    const checkbox = fila.getByRole("checkbox", { name: "Realizado" });
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();
    // La fecha de realización aparece al lado del checkbox de inmediato, sin recargar ni
    // apretar ningún botón de guardado.
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, "0")}/${String(
      hoy.getMonth() + 1,
    ).padStart(2, "0")}/${hoy.getFullYear()}`;
    await expect(fila.getByText(fechaFormateada)).toBeVisible();

    // Persiste sin depender de "Guardar cambios" — recargar la página no lo pierde.
    await page.reload();
    await page.getByRole("tab", { name: "Planes" }).click();
    const filaTrasReload = page.getByRole("row", { name: /Limpieza dental/ });
    await expect(filaTrasReload.getByRole("checkbox", { name: "Realizado" })).toBeChecked();

    // Destildar limpia la fecha de realización, también de inmediato.
    await filaTrasReload.getByRole("checkbox", { name: "Realizado" }).uncheck();
    await expect(filaTrasReload.getByText(fechaFormateada)).toBeHidden();
  });
});
