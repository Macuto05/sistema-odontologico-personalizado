import { test, expect } from "@playwright/test";
import { formatearDocumentoParaMostrar } from "./helpers/formatearDocumento";

/**
 * Escenario 3 de quickstart.md (002-pantalla-inicio) — mismos prerrequisitos que
 * inicio-resumen.spec.ts. Reutiliza pacientes creados por alta-paciente.spec.ts /
 * buscar-paciente.spec.ts (001-gestion-pacientes) cuando ya corrieron antes en la misma
 * base; si no, crea uno propio para no depender del orden de ejecución.
 *
 * Revisión posterior (008-rediseno-visual-sistema): el buscador de Inicio pasó al
 * `TopAppBar` compartido (docs/design-system.md §6.20) — ya no hay un botón "Buscar"
 * visible, se envía con Enter en el campo.
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

test.describe("Búsqueda desde el inicio (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("buscar por nombre parcial redirige a Pacientes con resultados (FR-009)", async ({
    page,
  }) => {
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Buscado Desde Inicio");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1992-03-03");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await page.goto("/");
    await page.getByLabel("Buscar por nombre o documento").fill("buscado desde inicio");
    await page.getByLabel("Buscar por nombre o documento").press("Enter");
    await page.waitForURL(/\/pacientes\?q=/);

    // La <tr> se busca por documento — desde el rediseño de la tabla (001-gestion-pacientes,
    // tasks.md Fase 8) el link solo envuelve nombre+avatar, el documento queda en una celda
    // aparte dentro de la misma fila.
    const fila = page.locator("tr", { hasText: formatearDocumentoParaMostrar(documento) });
    await expect(fila).toContainText("Buscado Desde Inicio");
  });

  test("buscar por documento exacto redirige a Pacientes con un único resultado (FR-009)", async ({
    page,
  }) => {
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Documento Exacto");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1993-04-04");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await page.goto("/");
    await page.getByLabel("Buscar por nombre o documento").fill(documento);
    await page.getByLabel("Buscar por nombre o documento").press("Enter");
    await page.waitForURL(/\/pacientes\?q=/);

    // Ver nota en el test anterior sobre por qué se busca por <tr> y no por link.
    await expect(page.locator("tr", { hasText: formatearDocumentoParaMostrar(documento) })).toBeVisible();
  });

  test("bloquea la búsqueda si el campo está vacío (FR-010)", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Buscar por nombre o documento").press("Enter");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/al menos un criterio/i)).toBeVisible();
  });
});
