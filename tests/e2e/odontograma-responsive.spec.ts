import { test, expect } from "@playwright/test";

/** Verificación de responsive del tab Odontograma en los tres breakpoints de
 * docs/design-system.md §4.0 (006-odontograma, Principio VI). El diagrama de dientes
 * scrollea horizontalmente dentro de su propio contenedor en pantallas angostas (mismo
 * criterio que una tabla ancha) — lo que no debe pasar es que la PÁGINA entera scrollee
 * horizontalmente. Se verifica desde el tab Odontograma de la ficha (rediseño visual
 * posterior quitó el botón "Ver odontograma" que llevaba a la ruta standalone, por
 * redundante con este tab) — no hace falta entrar en modo edición, los dientes se
 * renderizan igual en modo lectura. */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";

async function iniciarSesionYOdontograma(page: import("@playwright/test").Page, documento: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");

  await page.goto("/pacientes/nuevo");
  await page.getByLabel("Nombre completo").fill("Paciente Odontograma Responsive");
  await page.getByLabel("Documento de identidad").fill(documento);
  await page.getByLabel("Fecha de nacimiento").fill("1990-12-12");
  await page.getByRole("button", { name: /crear paciente|creando/i }).click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.getByRole("tab", { name: "Odontograma" }).click();
}

test.describe("Odontograma — responsive (§4.0)", () => {
  test("celular (<640px): sin scroll horizontal de página, el diagrama scrollea en su propio contenedor", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await iniciarSesionYOdontograma(page, `O0901${Date.now()}`);

    await expect(page.getByRole("button", { name: "Diente 18 completo" })).toBeVisible();
    const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
    const anchoVentana = await page.evaluate(() => window.innerWidth);
    expect(anchoDocumento).toBeLessThanOrEqual(anchoVentana + 1);
  });

  test("tablet (640–1023px): panel de herramientas y diagrama conviven sin scroll de página", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await iniciarSesionYOdontograma(page, `O0902${Date.now()}`);

    const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
    const anchoVentana = await page.evaluate(() => window.innerWidth);
    expect(anchoDocumento).toBeLessThanOrEqual(anchoVentana + 1);
  });

  test("escritorio (≥1024px): todo el diagrama visible sin scroll horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await iniciarSesionYOdontograma(page, `O0903${Date.now()}`);

    await expect(page.getByRole("button", { name: "Diente 18 completo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Diente 48 completo" })).toBeVisible();
    const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
    const anchoVentana = await page.evaluate(() => window.innerWidth);
    expect(anchoDocumento).toBeLessThanOrEqual(anchoVentana + 1);
  });
});
