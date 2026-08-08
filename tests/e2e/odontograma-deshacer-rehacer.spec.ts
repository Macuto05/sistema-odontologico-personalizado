import { test, expect } from "@playwright/test";

/** Deshacer/Rehacer (revisión posterior a 006-odontograma) — pila en memoria de snapshots,
 * restaurados vía escritura directa al repositorio (no reinvocando registrar/editar/
 * eliminarHallazgo uno por uno). */

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
  await page.getByLabel("Nombre completo").fill("Paciente Deshacer");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
}

async function expandirCategoria(page: import("@playwright/test").Page, categoria: string) {
  await page.getByRole("tab", { name: categoria, exact: true }).click();
}

test.describe("Odontograma — Deshacer/Rehacer", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("deshace un hallazgo agregado y lo vuelve a rehacer", async ({ page }) => {
    await abrirOdontograma(page, `O0201${Date.now()}`);

    await expect(page.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Rehacer" })).toBeDisabled();

    await page.getByRole("button", { name: "Diente 16, superficie oclusal/incisal" }).click();
    await expandirCategoria(page, "Patología");
    await page.getByRole("button", { name: "Caries", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Deshacer" })).toBeEnabled();
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Rehacer" })).toBeEnabled();
    await page.getByRole("button", { name: "Rehacer" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("una acción manual nueva vacía la pila de rehacer", async ({ page }) => {
    await abrirOdontograma(page, `O0202${Date.now()}`);

    await page.getByRole("button", { name: "Diente 16, superficie oclusal/incisal" }).click();
    await expandirCategoria(page, "Patología");
    await page.getByRole("button", { name: "Caries", exact: true }).click();
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByRole("button", { name: "Rehacer" })).toBeEnabled();

    // Diente 16 sigue seleccionado (deshacer no toca la selección) — una acción manual
    // nueva ahí mismo invalida el rehacer pendiente.
    await expandirCategoria(page, "Patología");
    await page.getByRole("button", { name: "Caries", exact: true }).click();
    await expect(page.getByRole("button", { name: "Rehacer" })).toBeDisabled();
  });

  test("deshacer/rehacer quedan ocultos en modo solo lectura (paciente archivado)", async ({
    page,
  }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Deshacer Archivado");
    await page.getByLabel("Documento de identidad").fill(`O0203${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await page.getByRole("button", { name: "Archivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await expect(page.getByRole("button", { name: "Deshacer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Rehacer" })).toHaveCount(0);
  });
});
