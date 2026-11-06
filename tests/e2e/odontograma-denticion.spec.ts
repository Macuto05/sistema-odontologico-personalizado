import { test, expect } from "@playwright/test";

/**
 * Escenario 2 de specs/006-odontograma/quickstart.md — dentición Adulto/Niño (US2), en el
 * odontograma UNIFICADO: un solo diagrama con adulto arriba y abajo y niño en el medio (ya no
 * hay pestañas Adulto/Niño). Los dientes de niño se pueden ocultar con un botón; por defecto
 * se muestran si el paciente tiene menos de 13 años o ya tiene datos de niño.
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

async function abrirOdontograma(
  page: import("@playwright/test").Page,
  documento: string,
  fechaNacimiento = "2015-05-05",
) {
  // Nombre único: si la app cae al listado (ver abajo) es lo que se usa para encontrarlo.
  const nombre = `Paciente Denticion ${documento}`;
  const esFicha = (url: URL) => /^\/pacientes\/[0-9a-f-]{36}$/.test(url.pathname);
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill(nombre);
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill(fechaNacimiento);
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  // Tras crear, la app va a la ficha solo si `hayConexionReal()` responde en 1.5 s; si no,
  // cae al listado (comportamiento offline-first intencional). Con un servidor de desarrollo
  // frío o una base remota lenta eso pasa aunque haya conexión, así que se aceptan ambos
  // destinos y, en el listado, se abre el paciente recién creado (ya está en IndexedDB).
  await page.waitForURL((url) => esFicha(url) || url.pathname === "/pacientes");
  if (!esFicha(new URL(page.url()))) {
    await page.goto(`/pacientes?q=${encodeURIComponent(nombre)}`);
    await page.getByRole("link", { name: nombre }).click();
    await page.waitForURL(esFicha);
  }
  await page.getByRole("button", { name: "Nueva cita" }).click();
  await page.waitForURL(/\/citas\/[0-9a-f-]{36}\?pacienteId=/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
  // Paciente nuevo: antes de crear sus odontogramas locales la app consulta al servidor si
  // ya existen (hasta 10 s, para no generar duplicados) — se espera a que termine de cargar.
  await expect(page.getByRole("button", { name: "Diente 18 completo" })).toBeVisible({
    timeout: 30_000,
  });
}

async function expandirCategoria(page: import("@playwright/test").Page, categoria: string) {
  await page.getByRole("tab", { name: categoria, exact: true }).click();
}

test.describe("Odontograma — Dentición Adulto/Niño unificada (US2)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 2: paciente niño ve adulto y niño juntos, y puede ocultar los de niño", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0201${Date.now()}`);

    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Diente 55 completo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Diente 85 completo" })).toBeVisible();

    await page.getByRole("button", { name: "Ocultar dientes de niño" }).click();
    await expect(page.getByRole("button", { name: "Diente 55 completo" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toBeVisible();

    await page.getByRole("button", { name: "Mostrar dientes de niño" }).click();
    await expect(page.getByRole("button", { name: "Diente 55 completo" })).toBeVisible();
  });

  test("Escenario 2: paciente adulto sin datos de niño los tiene ocultos por defecto", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0204${Date.now()}`, "1990-01-01");

    await expect(page.getByRole("button", { name: "Diente 16 completo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Diente 55 completo" })).toHaveCount(0);
    await page.getByRole("button", { name: "Mostrar dientes de niño" }).click();
    await expect(page.getByRole("button", { name: "Diente 55 completo" })).toBeVisible();
  });

  test("Escenario 2: Pulpotomía solo aparece en dientes de niño (FR-012)", async ({ page }) => {
    await abrirOdontograma(page, `O0202${Date.now()}`);

    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expandirCategoria(page, "Endodoncia");
    await expect(page.getByRole("button", { name: "Pulpotomía", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pulpectomía", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tratamiento de conducto" })).toBeVisible();

    await page.getByRole("button", { name: "Diente 55 completo" }).click();
    await expandirCategoria(page, "Endodoncia");
    await expect(page.getByRole("button", { name: "Pulpotomía", exact: true })).toBeVisible();
  });

  test("Escenario 2: los hallazgos de adulto y de niño se conservan de forma independiente", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0203${Date.now()}`);

    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expandirCategoria(page, "Ausencia / Extracción");
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    // El 55 (debajo del 15/16) no hereda el hallazgo del 16.
    await page.getByRole("button", { name: "Diente 55 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await expandirCategoria(page, "Ausencia / Extracción");
    await page.getByRole("button", { name: "Ausente", exact: true }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    await page.getByRole("button", { name: "Diente 16 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();
  });

  test("Escenario 2: un puente no puede unir un diente de adulto con uno de niño", async ({
    page,
  }) => {
    await abrirOdontograma(page, `O0205${Date.now()}`);

    await page.getByRole("button", { name: "Diente 15 completo" }).click();
    await expandirCategoria(page, "Prótesis");
    await page.getByRole("button", { name: "Puente fijo", exact: true }).click();
    await page.getByRole("button", { name: "Diente 55 completo" }).click();
    await expect(page.getByText("Elige otro diente de adulto.")).toBeVisible();
  });
});
