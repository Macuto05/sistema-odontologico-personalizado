import { test, expect } from "@playwright/test";
import { formatearDocumentoParaMostrar } from "./helpers/formatearDocumento";

/** Escenario 2 de quickstart.md — requiere entorno real, igual que los otros e2e. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function crearPaciente(
  page: import("@playwright/test").Page,
  nombre: string,
  documento: string,
) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill(nombre);
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-15");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  // Con conexión, crear salta directo a la ficha del paciente recién creado; cada test
  // navega explícitamente a /pacientes después para probar la búsqueda del listado.
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
}

test.describe("Búsqueda de pacientes (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("busca por nombre parcial insensible a mayúsculas (FR-005)", async ({ page }) => {
    const sufijo = Date.now();
    const nombre = `Juana BuscarTest ${sufijo}`;
    await crearPaciente(page, nombre, `V9009${sufijo}`);

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(`juana buscartest ${sufijo}`);
    await expect(page.getByText(nombre)).toBeVisible();
  });

  test("busca por documento exacto, con el prefijo V incluido (FR-005)", async ({ page }) => {
    const sufijo = Date.now();
    const documento = `V9009${sufijo}`;
    await crearPaciente(page, `Paciente Buscado ${sufijo}`, documento);

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(documento);
    await expect(page.getByText(formatearDocumentoParaMostrar(documento))).toBeVisible();
  });

  test("busca por solo los dígitos de la cédula, sin el prefijo V (FR-005)", async ({ page }) => {
    // Así es como realmente busca el odontólogo: tipeando la cédula, no "V" + cédula —
    // el prefijo es un detalle de cómo se guarda, no algo que el usuario conoce/tipea.
    const sufijo = Date.now();
    const numero = `9009${sufijo}`;
    await crearPaciente(page, `Paciente Cedula ${sufijo}`, `V${numero}`);

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(numero);
    await expect(page.getByText(`Paciente Cedula ${sufijo}`)).toBeVisible();
  });

  test("sin coincidencias muestra un estado vacío explícito", async ({ page }) => {
    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(`NoExiste-${Date.now()}`);
    await expect(page.getByText(/no se encontraron pacientes/i)).toBeVisible();
  });
});
