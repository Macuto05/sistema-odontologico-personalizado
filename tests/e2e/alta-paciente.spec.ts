import { test, expect } from "@playwright/test";
import { formatearDocumentoParaMostrar } from "./helpers/formatearDocumento";

/**
 * Escenario 1 de quickstart.md — requiere: servidor corriendo (npm run dev), PostgreSQL
 * con migraciones aplicadas, y la cuenta sembrada por prisma/seed.ts. Variables de entorno
 * de la cuenta de prueba: E2E_ODONTOLOGO_EMAIL / E2E_ODONTOLOGO_PASSWORD (deben coincidir
 * con SEED_ODONTOLOGO_EMAIL / SEED_ODONTOLOGO_PASSWORD usadas al sembrar).
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

test.describe("Alta de paciente (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("crea un paciente y salta directo a su ficha (con conexión)", async ({ page }) => {
    // El campo de documento (V-/E- + número) solo acepta dígitos — el prefijo "V" que
    // sigue es el default del selector, se conserva igual al tipear (se filtran las letras
    // y se vuelve a anteponer el mismo prefijo).
    const documento = `V9009${Date.now()}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente de Prueba");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1995-05-05");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();

    // Con conexión, crear salta directo a la ficha del paciente recién creado, no al
    // listado — offline no es posible (Service Worker no puede servir un id que nunca
    // visitó, ver nota en nuevo/page.tsx), pero con conexión sí.
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Paciente de Prueba" })).toBeVisible();
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await expect(page.getByText(formatearDocumentoParaMostrar(documento))).toBeVisible();
  });

  test("avisa si el documento ya existe (FR-004)", async ({ page }) => {
    const documento = `V9009${Date.now()}`;

    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Primero");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1990-01-01");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);

    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Segundo");
    await page.getByLabel("Documento de identidad").fill(documento);
    await page.getByLabel("Fecha de nacimiento").fill("1991-02-02");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();

    // Next.js agrega su propio role="alert" (anunciador de rutas) en modo dev; se acota
    // por texto para no chocar con él.
    await expect(page.getByRole("alert").filter({ hasText: /ya existe/i })).toBeVisible();
  });

  test("bloquea el guardado si faltan campos obligatorios (FR-002)", async ({ page }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await expect(page.getByText(/obligatorio/i).first()).toBeVisible();
  });
});
