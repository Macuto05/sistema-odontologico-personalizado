import { test, expect } from "@playwright/test";

/** Escenario 4 de specs/006-odontograma/quickstart.md — historial de cambios (US4).
 *
 * Segunda revisión posterior (feedback directo y reiterado de la odontóloga): "Historial" ya
 * no es una lista navegable de checkpoints — muestra una única foto, sin selector: cómo se
 * veía el odontograma justo antes del último "Guardar cambios". Nada de botones "N cambios
 * guardados" para elegir entre momentos pasados. Con la persistencia diferida, marcar un
 * hallazgo no lo persiste ni genera esa foto por sí solo — recién "Guardar cambios" (el
 * botón del panel de herramientas, no el "Listo"/"Editar" de la ficha) escribe en la base y
 * archiva "cómo se veía antes". Igual que en "Actual", un clic en un diente muestra su nota
 * y sus hallazgos en el mismo cuadro — acá de solo lectura (feedback directo: antes no había
 * forma de ver la nota/condición de un diente en este momento pasado). */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

async function expandirCategoria(page: import("@playwright/test").Page, categoria: string) {
  await page.getByRole("tab", { name: categoria, exact: true }).click();
}

/** Persistencia diferida: nada se guarda en la base (ni genera checkpoint) hasta este clic. */
async function guardarCambios(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeHidden();
}

/** Abre la pestaña Odontograma de la ficha del paciente (no una Cita) — el checkpoint acá
 * se dispara con "Guardar cambios", sin depender de finalizar ninguna atención. */
async function abrirOdontogramaFicha(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Historial");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-07-07");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
}

/** El botón "Listo" que cierra la sesión de edición de toda la pestaña (junto a las pestañas
 * Actual/Historial, misma fila — feedback directo) — ya no persiste nada por sí solo
 * (revisión posterior sobre guardado diferido): si hay borrador sin guardar, lo descarta.
 * Distinto del panel de herramientas, que ahora usa "Guardar cambios"/"Cancelar" en vez de
 * "Listo". Oculto mientras la vista Historial está activa, así que se busca dentro de la
 * fila que también contiene la pestaña "Actual" para no ambigüar con otros botones. */
function botonListoFicha(page: import("@playwright/test").Page) {
  return page.locator('[class*="filaVista"]').getByRole("button", { name: "Listo" });
}

async function marcarAusente(page: import("@playwright/test").Page, diente: number) {
  await page.getByRole("button", { name: `Diente ${diente} completo` }).click();
  await expandirCategoria(page, "Ausencia / Extracción");
  await page.getByRole("button", { name: "Ausente", exact: true }).click();
}

test.describe("Odontograma — Historial de cambios (US4)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("Escenario 4: un paciente sin cambios muestra el mensaje explícito", async ({ page }) => {
    await abrirOdontogramaFicha(page, `O0401${Date.now()}`);

    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(page.getByText("Todavía no hay cambios registrados")).toBeVisible();
  });

  test("Escenario 4: un hallazgo agregado no aparece en el historial hasta Guardar cambios", async ({
    page,
  }) => {
    await abrirOdontogramaFicha(page, `O0402${Date.now()}`);

    await page.getByRole("button", { name: "Editar" }).click();
    await marcarAusente(page, 12);
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    // Todavía en borrador (sin guardar) — nada archivado en el historial.
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(page.getByText("Todavía no hay cambios registrados")).toBeVisible();
    await page.getByRole("tab", { name: "Actual" }).click();

    // "Guardar cambios" (panel de herramientas) persiste y archiva cómo se veía ANTES.
    await guardarCambios(page);
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(page.getByText("Así se veía antes del último guardado")).toBeVisible();
    // Ninguna lista de checkpoints para elegir — una sola foto, sin selector.
    await expect(page.getByRole("button", { name: /cambio guardado/i })).toHaveCount(0);
  });

  test("Escenario 4: salir de edición sin Guardar cambios descarta el borrador (no archiva nada)", async ({
    page,
  }) => {
    await abrirOdontogramaFicha(page, `O0404${Date.now()}`);

    await page.getByRole("button", { name: "Editar" }).click();
    await marcarAusente(page, 12);
    await expect(page.getByRole("button", { name: "Eliminar" })).toBeVisible();

    // Sale de edición SIN apretar "Guardar cambios" — el borrador se descarta.
    await botonListoFicha(page).click();
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(page.getByText("Todavía no hay cambios registrados")).toBeVisible();

    // Vuelve a entrar: el diente 12 ya no tiene el hallazgo abandonado.
    await page.getByRole("tab", { name: "Actual" }).click();
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByRole("button", { name: "Diente 12 completo" }).click();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  });

  test("Escenario 4: solo muestra cómo se veía antes del último guardado, sin lista ni selector", async ({
    page,
  }) => {
    await abrirOdontogramaFicha(page, `O0403${Date.now()}`);

    // Sesión 1: agrega Ausente en el 12 y guarda — archiva "antes" (vacío).
    await page.getByRole("button", { name: "Editar" }).click();
    await marcarAusente(page, 12);
    await guardarCambios(page);

    // Sesión 2: agrega Ausente en el 13 y guarda — archiva "antes" (solo el 12 ausente, como
    // quedó al guardar la sesión 1) — esto pisa/reemplaza lo que había mostrado la sesión 1,
    // no se acumula ninguna lista.
    await marcarAusente(page, 13);
    await guardarCambios(page);

    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(page.getByText("Así se veía antes del último guardado")).toBeVisible();
    // Nada de lista/selector de checkpoints anteriores.
    await expect(page.getByRole("button", { name: /cambio guardado/i })).toHaveCount(0);

    // El símbolo de un hallazgo se dibuja como un <svg> adicional dentro del botón del
    // diente completo (además del <svg> del contorno, siempre presente) — sin texto/
    // aria-label propio, así que la forma de verificar "¿este diente tiene algo marcado?"
    // en el diagrama de solo lectura del historial es contar esos <svg> hijos.
    async function tieneHallazgo(diente: number) {
      const svgs = await page
        .getByRole("button", { name: `Diente ${diente} completo` })
        .locator("svg")
        .count();
      return svgs > 1;
    }

    // Reconstruye el momento justo antes de la sesión 2 (la última guardada): solo el
    // diente 12 ausente, el 13 todavía no existía en ese momento.
    await expect.poll(() => tieneHallazgo(12)).toBe(true);
    await expect.poll(() => tieneHallazgo(13)).toBe(false);
  });

  test("Escenario 4: un clic en un diente muestra su nota y condición, de solo lectura", async ({
    page,
  }) => {
    await abrirOdontogramaFicha(page, `O0405${Date.now()}`);

    await page.getByRole("button", { name: "Editar" }).click();
    await marcarAusente(page, 12);
    await page.getByLabel("Nota").fill("Diente flojo");
    await page.getByLabel("Nota").blur();
    await guardarCambios(page);

    await page.getByRole("tab", { name: "Historial" }).click();
    // Sin selección todavía: solo el mensaje de ayuda, sin nota ni hallazgos.
    await expect(page.getByText("Haz clic en un diente")).toBeVisible();

    await page.getByRole("button", { name: "Diente 12 completo" }).click();
    await expect(page.getByText("Diente 12", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Nota")).toHaveValue("Diente flojo");
    await expect(page.getByLabel("Nota")).toHaveAttribute("readonly", "");
    await expect(page.getByText("Ausente", { exact: true })).toBeVisible();
    // De solo lectura: nada de acciones para modificar el hallazgo desde acá.
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /marcar (realizado|pendiente)/i })).toHaveCount(0);
  });
});
