import { test, expect } from "@playwright/test";
import { formatearDocumentoParaMostrar } from "./helpers/formatearDocumento";

/** Escenario 4 de quickstart.md — requiere entorno real, igual que los otros e2e. */

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
  await page.getByLabel("Nombre completo").fill("Paciente a Archivar");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-08-08");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  // Con conexión, crear salta directo a la ficha del paciente recién creado.
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
}

async function archivarConConfirmacion(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();
}

async function reactivarConConfirmacion(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Reactivar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reactivar" }).click();
}

test.describe("Archivado y reactivación (US4)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("pide confirmación antes de archivar", async ({ page }) => {
    await crearPaciente(page, `V9009${Date.now()}`);
    await page.getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByRole("dialog")).toContainText(/archivar/i);
    // Cancelar no debe archivar:
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
  });

  test("archivar oculta del listado activo pero se ve en la pestaña Archivados", async ({ page }) => {
    const documento = `V9009${Date.now()}`;
    await crearPaciente(page, documento);
    await archivarConConfirmacion(page);
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();

    // Vuelve al listado — pestaña "Activos" por defecto, este paciente ya no aparece ahí
    // (unificado con pestañas, ya no es una ruta separada — tasks.md Fase 8).
    await page.goto("/pacientes");
    await expect(page.getByText(formatearDocumentoParaMostrar(documento))).toBeHidden();

    await page.getByRole("tab", { name: "Archivados" }).click();
    await expect(page.getByText(formatearDocumentoParaMostrar(documento))).toBeVisible();
  });

  test("reactivar devuelve el paciente al listado por defecto", async ({ page }) => {
    const documento = `V9009${Date.now()}`;
    await crearPaciente(page, documento);
    await archivarConConfirmacion(page);
    await reactivarConConfirmacion(page);
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();

    await page.goto("/pacientes");
    await expect(page.getByText(formatearDocumentoParaMostrar(documento))).toBeVisible();
  });
});
