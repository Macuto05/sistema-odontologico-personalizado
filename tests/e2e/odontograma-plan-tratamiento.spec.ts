import { test, expect } from "@playwright/test";

/** Escenario 5 de specs/006-odontograma/quickstart.md — plan de tratamiento (US5). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function abrirAtencion(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Plan Tratamiento");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-08-08");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
}

test.describe("Odontograma — Plan de tratamiento (US5)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 5: agrega, edita y elimina una línea del plan de tratamiento", async ({
    page,
  }) => {
    await abrirAtencion(page, `O0501${Date.now()}`);
    await page.getByRole("tab", { name: "Odontograma" }).click();

    await page.getByLabel("Elemento dentario (opcional)").fill("16");
    await page.getByLabel("Tratamiento ejecutado").fill("Obturación");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText("Obturación")).toBeVisible();

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Tratamiento ejecutado").fill("Obturación revisada");
    // "Confirmar línea" (no "Guardar cambios") — ese texto quedó reservado para el guardado
    // global de la sesión, que persiste esta línea del borrador recién cuando se aprieta.
    await page.getByRole("button", { name: "Confirmar línea" }).click();
    await expect(page.getByText("Obturación revisada")).toBeVisible();

    await page.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Todavía no hay líneas cargadas")).toBeVisible();
  });

  test("Escenario 5: permite un tratamiento general sin diente asociado", async ({ page }) => {
    await abrirAtencion(page, `O0502${Date.now()}`);
    await page.getByRole("tab", { name: "Odontograma" }).click();

    await page.getByLabel("Tratamiento ejecutado").fill("Limpieza general");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText("Limpieza general")).toBeVisible();
  });

  test("Escenario 5: una línea del plan queda en borrador hasta 'Guardar cambios'", async ({
    page,
  }) => {
    await abrirAtencion(page, `O0504${Date.now()}`);
    await page.getByRole("tab", { name: "Odontograma" }).click();

    await page.getByLabel("Tratamiento ejecutado").fill("Limpieza dental");
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText("Limpieza dental")).toBeVisible();

    // Sin guardar, un reload la pierde — nada se escribió en la base todavía.
    await page.reload();
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await expect(page.getByText("Limpieza dental")).toBeHidden();

    // Repite y esta vez sí guarda: persiste después de recargar.
    await page.getByLabel("Tratamiento ejecutado").fill("Limpieza dental");
    await page.getByRole("button", { name: "Agregar" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.reload();
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await expect(page.getByText("Limpieza dental")).toBeVisible();
  });

  test("Escenario 5: el campo 'Plan de tratamiento' ya no existe en Diagnóstico (FR-017)", async ({
    page,
  }) => {
    await abrirAtencion(page, `O0503${Date.now()}`);
    await page.getByRole("tab", { name: "Diagnóstico" }).click();
    await expect(page.getByLabel("Motivo de consulta")).toBeVisible();
    await expect(page.getByLabel("Diagnóstico", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Plan de tratamiento")).toHaveCount(0);
  });
});
