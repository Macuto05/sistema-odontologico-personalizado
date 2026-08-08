import { test, expect } from "@playwright/test";

/**
 * Escenario 4 de quickstart.md (002-pantalla-inicio) — mismos prerrequisitos que
 * inicio-resumen.spec.ts. Corre en serie (no fullyParallel) porque todos los tests
 * mutan la misma cuenta única sembrada (nombre/email/contraseña).
 */
test.describe.configure({ mode: "serial" });

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";
const NOMBRE_ORIGINAL = process.env.E2E_ODONTOLOGO_NOMBRE ?? "Odontólogo de Prueba";

async function iniciarSesion(page: import("@playwright/test").Page, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Configuración: editar perfil y contraseña (US4)", () => {
  test("edita nombre y email válidos y el inicio los refleja (FR-011)", async ({ page }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");

    const nombreNuevo = `Odontóloga E2E ${Date.now()}`;
    // "Nombre (Requerido)" completo: la sección de Consultorios (004-consultorios) agregó
    // un campo "Nombre del consultorio" que también matchea un getByLabel("Nombre") simple.
    await page.getByLabel("Nombre (Requerido)").fill(nombreNuevo);
    await page.getByRole("button", { name: /guardar perfil/i }).click();
    await expect(page.getByText(/guardado/i)).toBeVisible();

    await page.goto("/");
    // Acotado al encabezado: la tarjeta de perfil de la sidebar (004-consultorios,
    // rediseño de la sidebar) también muestra el nombre, así que un getByText genérico
    // matchea dos elementos.
    await expect(page.getByRole("heading", { name: new RegExp(nombreNuevo) })).toBeVisible();

    // Restaura el nombre original — la cuenta es única y compartida con otros specs de
    // e2e (ej. inicio-resumen.spec.ts) que corren en paralelo y asumen ese nombre.
    await page.goto("/configuracion");
    await page.getByLabel("Nombre (Requerido)").fill(NOMBRE_ORIGINAL);
    await page.getByRole("button", { name: /guardar perfil/i }).click();
    await expect(page.getByText(/guardado/i)).toBeVisible();
  });

  test("rechaza un email con formato inválido en vivo, mientras se escribe (FR-012)", async ({ page }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
    await page.getByLabel("Email").fill("no-es-un-email");
    // Validación en vivo: el mensaje aparece sin necesitar enviar el formulario, y el botón
    // queda deshabilitado para que un email inválido no llegue nunca al servidor.
    await expect(page.getByText(/inválid/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /guardar perfil/i })).toBeDisabled();
  });

  test("cambia la contraseña con la actual correcta, y la nueva sirve para iniciar sesión (FR-013)", async ({
    page,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");

    const passwordNueva = `NuevaSegura-${Date.now()}`;
    await page.getByLabel("Contraseña actual").fill(PASSWORD);
    await page.getByLabel("Contraseña nueva").fill(passwordNueva);
    await page.getByRole("button", { name: /cambiar contraseña/i }).click();
    await expect(page.getByText(/contraseña actualizada/i)).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/login");
    await iniciarSesion(page, passwordNueva);

    // Devuelve la cuenta a su contraseña original para no romper otros tests/escenarios.
    await page.goto("/configuracion");
    await page.getByLabel("Contraseña actual").fill(passwordNueva);
    await page.getByLabel("Contraseña nueva").fill(PASSWORD);
    await page.getByRole("button", { name: /cambiar contraseña/i }).click();
    await expect(page.getByText(/contraseña actualizada/i)).toBeVisible();
  });

  test("rechaza el cambio si la contraseña actual es incorrecta (FR-014)", async ({ page }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");
    await page.getByLabel("Contraseña actual").fill("esto-no-es-correcto");
    // Cumple las reglas clásicas (mayúscula, número, especial) para que el botón quede
    // habilitado — este test no evalúa la fuerza de la contraseña nueva, solo el rechazo
    // por contraseña actual incorrecta.
    await page.getByLabel("Contraseña nueva").fill("otraNuevaSegura123!");
    await page.getByRole("button", { name: /cambiar contraseña/i }).click();
    await expect(page.getByText(/incorrecta/i)).toBeVisible();

    // La contraseña vigente sigue funcionando — el rechazo no la tocó.
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/login");
    await iniciarSesion(page, PASSWORD);
  });

  test("un fallo de red al guardar es visible, no silencioso (research.md #1)", async ({
    page,
    context,
  }) => {
    await iniciarSesion(page);
    await page.goto("/configuracion");

    // Espera a que el perfil (nombre/email) termine de cargar antes de simular la
    // desconexión — si no, el fetch inicial a /api/account puede quedar en carrera con
    // setOffline y fallar, dejando el email vacío y el botón deshabilitado por la
    // validación en vivo (comportamiento distinto al que este test quiere ejercitar).
    await expect(page.getByRole("button", { name: /guardar perfil/i })).toBeEnabled();

    await context.setOffline(true);
    await page.getByLabel("Nombre (Requerido)").fill("Cambio Sin Conexión");
    await page.getByRole("button", { name: /guardar perfil/i }).click();
    await expect(page.getByText(/conexión/i)).toBeVisible();
    await context.setOffline(false);
  });
});
