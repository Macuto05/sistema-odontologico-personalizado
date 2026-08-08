import { test, expect, type Page } from "@playwright/test";

/**
 * Escenarios 1 a 4 de `specs/010-gestion-insumos/quickstart.md` — requiere: servidor
 * corriendo (npm run dev), PostgreSQL con la migración de `Insumo` aplicada, y la cuenta
 * sembrada por prisma/seed.ts. Mismo esquema de credenciales que el resto de los e2e.
 */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

/**
 * Campos del formulario por id, no por label: el TopAppBar tiene un buscador con
 * aria-label "Buscar por nombre", y `getByLabel("Nombre")` (substring, insensible a
 * mayúsculas) matchea los dos. El componente Input usa `name` como `id`.
 */
function campo(page: Page, name: "nombre" | "categoria" | "stockActual" | "stockMinimo") {
  return page.locator(`#${name}`);
}

/** Crea un insumo desde la UI y vuelve al listado. Devuelve el nombre único usado. */
async function crearInsumo(
  page: Page,
  datos: { categoria?: string; stockActual: number; stockMinimo: number },
): Promise<string> {
  const nombre = `Insumo E2E ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await page.goto("/insumos/nuevo");
  await campo(page, "nombre").fill(nombre);
  if (datos.categoria) await campo(page, "categoria").fill(datos.categoria);
  await campo(page, "stockActual").fill(String(datos.stockActual));
  await campo(page, "stockMinimo").fill(String(datos.stockMinimo));
  await page.getByRole("button", { name: /crear insumo|creando/i }).click();
  await page.waitForURL(/\/insumos$/);
  return nombre;
}

/** Fila del listado correspondiente a un insumo, buscándolo primero por nombre. */
async function filaDe(page: Page, nombre: string) {
  await page.goto(`/insumos?q=${encodeURIComponent(nombre)}`);
  return page.getByRole("row").filter({ hasText: nombre });
}

test.describe("Gestión de insumos", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  // Escenario 1 — Alta (US1, FR-001 a FR-003)
  test("crea un insumo y lo muestra en el listado (FR-001)", async ({ page }) => {
    const nombre = await crearInsumo(page, {
      categoria: "Desechables",
      stockActual: 20,
      stockMinimo: 5,
    });

    const fila = await filaDe(page, nombre);
    await expect(fila).toBeVisible();
    await expect(fila).toContainText("Desechables");
    await expect(fila).toContainText("20");
    await expect(fila.getByText("En stock")).toBeVisible();
  });

  test("no permite guardar sin los campos obligatorios (FR-002)", async ({ page }) => {
    await page.goto("/insumos/nuevo");
    await page.getByRole("button", { name: /crear insumo/i }).click();

    await expect(page.getByText("El nombre es obligatorio")).toBeVisible();
    await expect(page).toHaveURL(/\/insumos\/nuevo$/);
  });

  test("rechaza un stock negativo (FR-003)", async ({ page }) => {
    await page.goto("/insumos/nuevo");
    await campo(page, "nombre").fill("Insumo inválido");
    await campo(page, "stockActual").fill("-5");
    await campo(page, "stockMinimo").fill("2");
    await page.getByRole("button", { name: /crear insumo/i }).click();

    await expect(page.getByText("El stock no puede ser negativo")).toBeVisible();
    await expect(page).toHaveURL(/\/insumos\/nuevo$/);
  });

  // Escenario 2 — Alertas de reposición (US2, FR-004 a FR-006)
  test("resalta como 'A reponer' cuando el stock llega al mínimo (FR-004, FR-005)", async ({
    page,
  }) => {
    const nombre = await crearInsumo(page, { stockActual: 5, stockMinimo: 5 });

    const fila = await filaDe(page, nombre);
    await expect(fila.getByText("A reponer")).toBeVisible();
  });

  test("cuenta los insumos a reponer en la pantalla de Inicio (FR-006)", async ({ page }) => {
    await page.goto("/");
    const contador = page.getByTestId("total-insumos-a-reponer");
    await expect(contador).toBeVisible();
    const antes = Number(await contador.innerText());

    await crearInsumo(page, { stockActual: 1, stockMinimo: 10 });

    await page.goto("/");
    await expect(contador).toHaveText(String(antes + 1));
  });

  test("deja de estar a reponer al reponer stock (FR-011)", async ({ page }) => {
    const nombre = await crearInsumo(page, { stockActual: 2, stockMinimo: 10 });

    let fila = await filaDe(page, nombre);
    await expect(fila.getByText("A reponer")).toBeVisible();

    await fila.getByRole("link", { name: nombre }).click();
    await page.waitForURL(/\/insumos\/[0-9a-f-]{36}$/);
    await campo(page, "stockActual").fill("50");
    await page.getByRole("button", { name: /guardar cambios|guardando/i }).click();
    await page.waitForURL(/\/insumos$/);

    fila = await filaDe(page, nombre);
    await expect(fila.getByText("En stock")).toBeVisible();
  });

  // Escenario 3 — Búsqueda y filtro (US3, FR-008, FR-009)
  test("busca por nombre parcial, sin distinguir mayúsculas (FR-008)", async ({ page }) => {
    const nombre = await crearInsumo(page, { stockActual: 30, stockMinimo: 5 });
    const fragmento = nombre.slice(-8).toUpperCase();

    await page.goto(`/insumos?q=${encodeURIComponent(fragmento)}`);
    await expect(page.getByRole("row").filter({ hasText: nombre })).toBeVisible();
  });

  test("muestra 'sin resultados' cuando nada coincide (US3-AC3)", async ({ page }) => {
    await page.goto("/insumos?q=zzz-no-existe-zzz");
    await expect(
      page.getByText("No se encontraron insumos con ese criterio de búsqueda."),
    ).toBeVisible();
  });

  // Escenario 4 — Archivado y reactivación (US5, FR-013, FR-014)
  test("archiva un insumo y lo saca del listado activo (FR-013)", async ({ page }) => {
    const nombre = await crearInsumo(page, { stockActual: 15, stockMinimo: 3 });

    const fila = await filaDe(page, nombre);
    await fila.getByRole("link", { name: nombre }).click();
    await page.waitForURL(/\/insumos\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Archivar" }).click();

    // FR-012: archivado no se edita — el formulario desaparece y aparece el aviso.
    await expect(page.getByText("Insumo archivado")).toBeVisible();

    // Ya no está en el listado activo…
    await page.goto(`/insumos?q=${encodeURIComponent(nombre)}`);
    await expect(page.getByRole("row").filter({ hasText: nombre })).toHaveCount(0);

    // …pero sí en la pestaña de archivados, con sus datos intactos (FR-015).
    await page.goto(`/insumos?q=${encodeURIComponent(nombre)}&estado=ARCHIVADO`);
    const filaArchivada = page.getByRole("row").filter({ hasText: nombre });
    await expect(filaArchivada).toBeVisible();
    await expect(filaArchivada).toContainText("15");
  });

  test("reactiva un insumo archivado (FR-014)", async ({ page }) => {
    const nombre = await crearInsumo(page, { stockActual: 15, stockMinimo: 3 });

    const fila = await filaDe(page, nombre);
    await fila.getByRole("link", { name: nombre }).click();
    await page.waitForURL(/\/insumos\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByText("Insumo archivado")).toBeVisible();

    await page.getByRole("button", { name: "Reactivar" }).click();
    await expect(campo(page, "stockActual")).toBeVisible();

    await page.goto(`/insumos?q=${encodeURIComponent(nombre)}`);
    await expect(page.getByRole("row").filter({ hasText: nombre })).toBeVisible();
  });
});
