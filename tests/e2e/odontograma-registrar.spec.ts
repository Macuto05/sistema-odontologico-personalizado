import { test, expect } from "@playwright/test";

/**
 * Escenario 1 de specs/006-odontograma/quickstart.md — registrar un hallazgo (US1).
 * Flujo de selección (segunda revisión, feedback directo de la odontóloga): clic en un
 * diente/superficie lo selecciona; la condición se elige en la barra lateral (no en un
 * modal); la nota libre del contexto vive ahí mismo, siempre visible, sin depender de que
 * haya una condición ni de un segundo clic.
 */

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
  await page.getByLabel("Nombre completo").fill("Paciente Odontograma");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  const urlPaciente = page.url();
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
  return urlPaciente;
}

/** Selecciona una categoría del panel de herramientas (pestañas horizontales, una activa a
 * la vez — reemplazaron al Accordion original). */
async function expandirCategoria(page: import("@playwright/test").Page, categoria: string) {
  await page.getByRole("tab", { name: categoria, exact: true }).click();
}

/** Persistencia diferida (revisión posterior): nada se guarda en la base hasta este clic —
 * antes de este cambio cada acción se guardaba de inmediato. */
async function guardarCambios(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();
}

test.describe("Odontograma — Registrar un hallazgo (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 1: marca una condición sobre un diente completo (Ausente) y persiste", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0101${Date.now()}`);

    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expect(page.getByText("Diente 16", { exact: true })).toBeVisible();
    await expandirCategoria(page, "Ausencia / Extracción");
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    // Nada se guarda hasta "Guardar cambios" — recién ahí se puede confirmar persistencia.
    await guardarCambios(page);
    await page.reload();
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("Escenario 1: marca una condición sobre una superficie específica (Caries) sin afectar las demás", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0102${Date.now()}`);

    await page
      .getByRole("button", { name: "Diente 26, superficie oclusal/incisal" })
      .click();
    await expandirCategoria(page, "Patología");
    await page.getByRole("button", { name: "Caries", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("Escenario 1: una condición con variante exige elegirla antes de aplicarse (Exudado)", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0103${Date.now()}`);

    await page.getByRole("button", { name: "Diente 11 completo" }).click();
    await expandirCategoria(page, "Patología");
    await page.getByRole("button", { name: "Exudado", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "PURULENTO" })).toBeVisible();
    await page.getByRole("button", { name: "PURULENTO" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("Escenario 1: una condición multi-diente de tramo abarca también los dientes intermedios (Puente fijo)", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0104${Date.now()}`);

    // 15 → 13 en la arcada superior adulta pasa por el 14: el tramo completo debe quedar
    // marcado, no solo los dos extremos clicados.
    await page.getByRole("button", { name: "Diente 15 completo" }).click();
    await expandirCategoria(page, "Prótesis");
    await page.getByRole("button", { name: "Puente fijo", exact: true }).click();
    await expect(page.getByText("Elige el diente adicional")).toBeVisible();

    await page.getByRole("button", { name: "Diente 13 completo" }).click();
    await expect(page.getByText("Elige el diente adicional")).toBeHidden();
    // La selección sigue siendo el diente 15 — no hizo falta volver a hacer clic ahí.
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    // El diente intermedio (14) también quedó marcado — mismo hallazgo, no un ícono
    // desconectado: clic en cualquiera de los 3 dientes del tramo muestra "Eliminar".
    await page.getByRole("button", { name: "Diente 14 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
    await page.getByRole("button", { name: "Diente 15 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("Escenario 1: un diente sin ninguna condición admite una nota igual", async ({ page }) => {
    await abrirOdontograma(page, `O0105${Date.now()}`);

    await page.getByRole("button", { name: "Diente 21 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await page.getByRole("textbox", { name: "Nota" }).fill("Extracción hace 2 años");
    // La nota se guarda en el borrador al perder foco (blur), no en cada tecleo.
    await page.keyboard.press("Tab");
    await guardarCambios(page);

    await page.reload();
    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Diente 21 completo" }).click();
    await expect(page.getByRole("textbox", { name: "Nota" })).toHaveValue(
      "Extracción hace 2 años",
    );
  });
});
