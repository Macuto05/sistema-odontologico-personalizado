import { test, expect } from "@playwright/test";

/**
 * Escenario 3 de quickstart.md (004-consultorios) — mismos prerrequisitos que
 * consultorios-configuracion.spec.ts.
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

async function crearConsultorio(page: import("@playwright/test").Page, nombre: string) {
  await page.goto("/configuracion");
  await page.getByLabel("Nombre del consultorio").fill(nombre);
  await page.getByRole("button", { name: "Agregar consultorio" }).click();
  await expect(page.getByText(nombre)).toBeVisible();
}

async function crearPacienteConConsultorio(
  page: import("@playwright/test").Page,
  nombre: string,
  documento: string,
  consultorio: string,
) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill(nombre);
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-01-01");
  if (consultorio) await page.getByLabel("Consultorio").selectOption({ label: consultorio });
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes(\/|$)/);
}

test.describe("Ver el consultorio de cada paciente en el listado (US3)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("la columna muestra el consultorio asignado, o 'Sin consultorio' si no tiene (FR-010)", async ({
    page,
  }) => {
    const sufijo = Date.now();
    const consultorio = `Sede Listado E2E ${sufijo}`;
    await crearConsultorio(page, consultorio);

    const nombreConSede = `Paciente Con Sede ${sufijo}`;
    const nombreSinSede = `Paciente Sin Sede ${sufijo}`;
    await crearPacienteConConsultorio(page, nombreConSede, `V9020${sufijo}`, consultorio);
    await crearPacienteConConsultorio(page, nombreSinSede, `V9021${sufijo}`, "");

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(nombreConSede);
    const filaConSede = page.locator("tr", { hasText: nombreConSede });
    await expect(filaConSede).toContainText(consultorio);

    await page.getByLabel("Buscar por nombre o documento").fill(nombreSinSede);
    const filaSinSede = page.locator("tr", { hasText: nombreSinSede });
    await expect(filaSinSede).toContainText("Sin consultorio");
  });

  test("al eliminar un consultorio, sus pacientes pasan a 'Sin consultorio' (FR-005)", async ({
    page,
  }) => {
    const sufijo = Date.now();
    const consultorio = `Sede Baja Listado E2E ${sufijo}`;
    await crearConsultorio(page, consultorio);

    const nombrePaciente = `Paciente Consultorio Eliminado ${sufijo}`;
    await crearPacienteConConsultorio(page, nombrePaciente, `V9022${sufijo}`, consultorio);

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(nombrePaciente);
    await expect(page.locator("tr", { hasText: nombrePaciente })).toContainText(consultorio);

    await page.goto("/configuracion");
    await page.getByRole("button", { name: `Eliminar ${consultorio}` }).click();

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(nombrePaciente);
    await expect(page.locator("tr", { hasText: nombrePaciente })).toContainText("Sin consultorio");
  });
});
