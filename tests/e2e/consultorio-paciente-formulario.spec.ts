import { test, expect } from "@playwright/test";

/**
 * Escenario 2 de quickstart.md (004-consultorios) — mismos prerrequisitos que
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

test.describe("Asignar un consultorio a un paciente (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("asigna un consultorio al crear un paciente y persiste (FR-006)", async ({ page }) => {
    const sufijo = Date.now();
    const consultorio = `Sede Alta E2E ${sufijo}`;
    const documento = `V9010${sufijo}`;
    await crearConsultorio(page, consultorio);

    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill(`Paciente Consultorio ${sufijo}`);
    await page.getByLabel("Documento de identidad").fill(documento.replace(/^V/, ""));
    await page.getByLabel("Fecha de nacimiento").fill("1990-01-01");
    await page.getByLabel("Consultorio").selectOption({ label: consultorio });
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes(\/|$)/);

    // Reabre en edición y confirma que el Select recuerda la asignación.
    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(documento);
    await page.getByText(`Paciente Consultorio ${sufijo}`).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByLabel("Consultorio")).toHaveValue(await obtenerIdConsultorio(page, consultorio));
  });

  test("cambia el consultorio asignado al editar un paciente existente (FR-007)", async ({
    page,
  }) => {
    const sufijo = Date.now();
    const consultorioA = `Sede Editar A ${sufijo}`;
    const consultorioB = `Sede Editar B ${sufijo}`;
    const documento = `V9011${sufijo}`;
    await crearConsultorio(page, consultorioA);
    await crearConsultorio(page, consultorioB);

    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill(`Paciente Editar Consultorio ${sufijo}`);
    await page.getByLabel("Documento de identidad").fill(documento.replace(/^V/, ""));
    await page.getByLabel("Fecha de nacimiento").fill("1991-02-02");
    await page.getByLabel("Consultorio").selectOption({ label: consultorioA });
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes(\/|$)/);

    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(documento);
    await page.getByText(`Paciente Editar Consultorio ${sufijo}`).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Consultorio").selectOption({ label: consultorioB });
    await page.getByRole("button", { name: /guardar cambios/i }).click();

    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByLabel("Consultorio")).toHaveValue(await obtenerIdConsultorio(page, consultorioB));
  });

  test("da de alta un paciente sin seleccionar ningún consultorio (FR-009)", async ({ page }) => {
    const sufijo = Date.now();
    const documento = `V9012${sufijo}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill(`Paciente Sin Consultorio ${sufijo}`);
    await page.getByLabel("Documento de identidad").fill(documento.replace(/^V/, ""));
    await page.getByLabel("Fecha de nacimiento").fill("1992-03-03");
    // No se toca el selector de Consultorio — debe quedar en "Sin consultorio".
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await page.waitForURL(/\/pacientes(\/|$)/);
  });
});

/** El <option> usa el id del consultorio como value — se resuelve leyendo el DOM del Select. */
async function obtenerIdConsultorio(
  page: import("@playwright/test").Page,
  nombre: string,
): Promise<string> {
  const valor = await page
    .getByLabel("Consultorio")
    .locator("option", { hasText: nombre })
    .getAttribute("value");
  if (valor === null) throw new Error(`No se encontró la opción "${nombre}" en el selector`);
  return valor;
}
