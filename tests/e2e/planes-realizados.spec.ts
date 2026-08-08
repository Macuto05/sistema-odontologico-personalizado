import { test, expect } from "@playwright/test";

/** Escenario 3 de specs/009-planes-tratamiento/quickstart.md — vista filtrada "Planes
 * Realizados" (US3, FR-009): misma fuente de datos que "Planes Pendientes", sin
 * sincronización manual. Revisión posterior (feedback directo): las dos vistas particionan
 * el mismo array (mutuamente excluyentes por `fechaRealizado`), ya no es "todos" + "los
 * realizados" (que antes duplicaba una fila marcada Realizado en ambas tablas). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function agregarLineaPlan(
  page: import("@playwright/test").Page,
  fecha: string,
  tratamiento: string,
) {
  await page.getByLabel("Fecha").fill(fecha);
  await page.getByLabel("Tratamiento ejecutado").fill(tratamiento);
  await page.getByRole("button", { name: "Agregar" }).click();
}

test.describe("Planes de tratamiento — Vista 'Planes Realizados' (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 3: filtra los realizados; desmarcar o eliminar desde el origen actualiza ambas vistas", async ({
    page,
  }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Planes Realizados");
    await page.getByLabel("Documento de identidad").fill(`P0301${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-05-05");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await agregarLineaPlan(page, "2026-08-01", "Extracción");
    await agregarLineaPlan(page, "2026-08-02", "Blanqueamiento");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.getByRole("tab", { name: "Planes" }).click();
    const seccionRealizados = page.getByRole("heading", { name: "Planes Realizados" }).locator("..");
    await expect(seccionRealizados.getByText("Todavía no hay planes realizados")).toBeVisible();

    // Marca solo "Extracción" como realizada.
    await page
      .getByRole("row", { name: /Extracción/ })
      .getByRole("checkbox", { name: "Realizado" })
      .check();

    await expect(
      seccionRealizados.getByRole("row", { name: /Extracción/ }),
    ).toBeVisible();
    await expect(
      seccionRealizados.getByRole("row", { name: /Blanqueamiento/ }),
    ).toHaveCount(0);

    // Desmarcar la saca de "Planes Realizados" de inmediato.
    await page
      .getByRole("row", { name: /Extracción/ })
      .first()
      .getByRole("checkbox", { name: "Realizado" })
      .uncheck();
    await expect(seccionRealizados.getByText("Todavía no hay planes realizados")).toBeVisible();

    // Vuelve a marcarla, y esta vez la elimina desde el origen (Odontograma) — debe
    // desaparecer de las dos vistas de Planes sin ninguna acción manual ahí.
    await page
      .getByRole("row", { name: /Extracción/ })
      .first()
      .getByRole("checkbox", { name: "Realizado" })
      .check();

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page
      .getByRole("row", { name: /Extracción/ })
      .getByRole("button", { name: "Eliminar" })
      .click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.getByRole("tab", { name: "Planes" }).click();
    await expect(page.getByRole("row", { name: /Extracción/ })).toHaveCount(0);
  });
});
