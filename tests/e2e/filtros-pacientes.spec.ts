import { test, expect } from "@playwright/test";

/**
 * Filtros del listado de pacientes por edad y consultorio (007-representante-menor).
 * El rango de edad libre y el selector de consultorio único viven siempre visibles en la
 * 3ra tarjeta de métricas (rediseño posterior, ya no un panel detrás de un botón "Filtros");
 * ambos se combinan con la búsqueda por texto y la pestaña Activos/Archivados ya existentes.
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

async function crearPaciente(
  page: import("@playwright/test").Page,
  nombre: string,
  documento: string,
  fechaNacimiento: string,
  consultorio?: string,
) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill(nombre);
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill(fechaNacimiento);
  if (consultorio) {
    await page.getByLabel("Consultorio").selectOption({ label: consultorio });
  }
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
}

test.describe("Filtros de pacientes por edad y consultorio (007-representante-menor)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("filtra por rango de edad libre", async ({ page }) => {
    const sufijo = Date.now();
    const nino = `Filtro Edad Nino ${sufijo}`;
    const adulto = `Filtro Edad Adulto ${sufijo}`;
    await crearPaciente(page, nino, `V9020${sufijo}0`, "2020-01-01");
    await crearPaciente(page, adulto, `V9020${sufijo}1`, "1970-01-01");

    // Búsqueda por el sufijo único del test, para no depender de cuántos otros pacientes
    // (de otros tests e2e) también caen dentro del rango de edad filtrado.
    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(String(sufijo));
    await page.getByLabel("Edad mínima").fill("0");
    await page.getByLabel("Edad máxima").fill("10");

    await expect(page.getByText(nino)).toBeVisible();
    await expect(page.getByText(adulto)).not.toBeVisible();
  });

  test("filtra por un consultorio puntual", async ({ page }) => {
    const sufijo = Date.now();
    const consultorio = `Sede Filtro E2E ${sufijo}`;
    const conConsultorio = `Filtro Consultorio Con ${sufijo}`;
    const sinConsultorio = `Filtro Consultorio Sin ${sufijo}`;

    await page.goto("/configuracion");
    await page.getByLabel("Nombre del consultorio").fill(consultorio);
    await page.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(page.getByText(consultorio)).toBeVisible();

    await crearPaciente(page, conConsultorio, `V9021${sufijo}0`, "1990-01-01", consultorio);
    await crearPaciente(page, sinConsultorio, `V9021${sufijo}1`, "1990-01-01");

    await page.goto("/pacientes");
    await page.getByLabel("Consultorio").selectOption({ label: consultorio });

    await expect(page.getByText(conConsultorio)).toBeVisible();
    await expect(page.getByText(sinConsultorio)).not.toBeVisible();
  });

  test("limpiar filtros vuelve a mostrar todo el listado", async ({ page }) => {
    const sufijo = Date.now();
    const adulto = `Filtro Limpiar Adulto ${sufijo}`;
    await crearPaciente(page, adulto, `V9022${sufijo}`, "1970-01-01");

    // Búsqueda por nombre para no depender de en qué página cae alfabéticamente entre el
    // resto de los pacientes ya sembrados por otros tests e2e — se combina con los filtros
    // de edad/consultorio, así que sigue probando lo mismo (research.md #11 paginación).
    await page.goto("/pacientes");
    await page.getByLabel("Buscar por nombre o documento").fill(adulto);
    await page.getByLabel("Edad máxima").fill("5");
    await expect(page.getByText(adulto)).not.toBeVisible();

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page.getByText(adulto)).toBeVisible();
  });
});
