import { test, expect } from "@playwright/test";

/** Escenario 7 de specs/006-odontograma/quickstart.md — solo lectura para paciente
 * archivado (FR-019). Se verifica desde la pestaña Odontograma de la ficha (rediseño
 * visual posterior): ahí el modo lectura/edición se controla con un botón "Editar" propio
 * de la pestaña, oculto para un paciente archivado — a diferencia de un paciente activo,
 * que arranca en modo lectura y necesita ese botón para poder marcar algo. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Odontograma — Solo lectura para paciente archivado (FR-019)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 7: un paciente archivado con hallazgos ve el odontograma solo en lectura", async ({
    page,
  }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Archivado Odonto");
    await page.getByLabel("Documento de identidad").fill(`O0701${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-10-10");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    const urlPaciente = page.url();

    await page.getByRole("tab", { name: "Odontograma" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await page.getByRole("button", { name: "Ausencia / Extracción", exact: true }).click();
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    // Persistencia diferida: sin este clic, navegar a otra página descartaría el borrador.
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();

    await page.goto(urlPaciente);
    await page.getByRole("button", { name: "Archivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByRole("button", { name: "Nueva cita" })).toHaveCount(0);
    // Esperar la insignia "Archivado" (no solo la ausencia de "Nueva cita") asegura que el
    // registro en Dexie ya refleja estado ARCHIVADO antes de navegar al odontograma — evita
    // una carrera bajo carga donde useLiveQuery en la otra ruta todavía resuelve ACTIVO.
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Odontograma" }).click();
    // El hallazgo marcado antes de archivar se sigue viendo en el diagrama.
    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toBeVisible();

    // Paciente archivado: no hay botón "Editar" — arranca y se queda en solo lectura.
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

    // Un clic no selecciona nada (solo lectura) — la barra lateral no ofrece ninguna acción.
    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expect(page.getByText("Haz clic en un diente")).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);

    await page.getByRole("button", { name: "Diente 17 completo" }).click();
    await expect(page.getByText("Haz clic en un diente")).toBeVisible();

    // El plan de tratamiento no muestra el formulario de alta.
    await expect(page.getByLabel("Tratamiento ejecutado")).toHaveCount(0);
  });
});
