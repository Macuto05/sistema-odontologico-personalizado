import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

/**
 * Pestaña Archivos de la ficha de paciente (rediseño visual posterior a 005/006) —
 * reemplaza a `atencion-archivos.spec.ts`: subir un archivo ya no se hace colgado de un
 * Estudio dentro de una Cita finalizada, sino desde esta pestaña, único punto de entrada.
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

async function crearPacienteYAbrirArchivos(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Archivos Ficha");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1988-08-08");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("tab", { name: "Archivos" }).click();
}

function crearArchivoTemporal(nombre: string, contenido: string) {
  const ruta = path.join(os.tmpdir(), nombre);
  fs.writeFileSync(ruta, contenido);
  return ruta;
}

test.describe("Ficha de paciente — Archivos", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("sin archivos muestra el mensaje explícito", async ({ page }) => {
    await crearPacienteYAbrirArchivos(page, `V9901${Date.now()}`);
    await expect(page.getByText("Este paciente todavía no tiene archivos.")).toBeVisible();
  });

  test("sube un archivo y aparece en la tabla, con link de descarga", async ({ page }) => {
    await crearPacienteYAbrirArchivos(page, `V9902${Date.now()}`);

    const ruta = crearArchivoTemporal("radiografia.jpg", "contenido-de-prueba");
    await page.getByLabel("Subir archivo").setInputFiles(ruta);

    await expect(page.getByText("radiografia.jpg")).toBeVisible();
    await expect(page.getByRole("link", { name: "Descargar radiografia.jpg" })).toBeVisible();
  });

  test("rechaza un tipo de archivo no soportado (FR-018)", async ({ page }) => {
    await crearPacienteYAbrirArchivos(page, `V9903${Date.now()}`);

    const ruta = crearArchivoTemporal("informe.docx", "contenido-de-prueba");
    await page.getByLabel("Subir archivo").setInputFiles(ruta);

    await expect(page.getByText(/solo se aceptan imágenes o archivos pdf/i)).toBeVisible();
  });

  test("elimina un archivo subido", async ({ page }) => {
    await crearPacienteYAbrirArchivos(page, `V9904${Date.now()}`);

    const ruta = crearArchivoTemporal("resultado.pdf", "contenido-de-prueba");
    await page.getByLabel("Subir archivo").setInputFiles(ruta);
    await expect(page.getByText("resultado.pdf")).toBeVisible();

    await page.getByRole("button", { name: "Eliminar resultado.pdf" }).click();
    await expect(page.getByText("resultado.pdf")).toHaveCount(0);
    await expect(page.getByText("Este paciente todavía no tiene archivos.")).toBeVisible();
  });

  test("informa que se requiere conexión si se sube sin conexión", async ({ page, context }) => {
    await crearPacienteYAbrirArchivos(page, `V9905${Date.now()}`);

    await context.setOffline(true);
    const ruta = crearArchivoTemporal("offline.jpg", "contenido-de-prueba");
    await page.getByLabel("Subir archivo").setInputFiles(ruta);

    await expect(page.getByText(/requiere conexión/i)).toBeVisible();
    await context.setOffline(false);
  });

  test("ya no se puede adjuntar un archivo desde el detalle de una cita finalizada", async ({
    page,
  }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill("Paciente Archivos Cita");
    await page.getByLabel("Documento de identidad").fill(`V9906${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1988-08-08");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    const urlPaciente = page.url();

    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByLabel("Diagnóstico").fill("Pide radiografía");
    await page.getByRole("tab", { name: "Estudios" }).click();
    await page.getByRole("button", { name: "+ Agregar estudio" }).click();
    await page.getByLabel("Estudio solicitado").fill("Radiografía panorámica");
    await page.getByRole("button", { name: /agregar estudio/i }).click();
    await page.getByRole("button", { name: "Finalizar atención" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar atención" }).click();
    await page.waitForURL(urlPaciente);

    await page.getByRole("button", { name: "Nueva cita" }).click();
    await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
    await page.getByRole("button", { name: "Antecedentes e historial de citas" }).click();
    await page.getByRole("button", { name: "Historial de citas anteriores", exact: true }).click();
    await page.getByRole("button", { name: /Pide radiografía/ }).click();
    await expect(page.getByText("Radiografía panorámica")).toBeVisible();
    await expect(page.getByLabel("Adjuntar resultado (imagen o PDF)")).toHaveCount(0);
  });
});
