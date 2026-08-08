import { test, expect } from "@playwright/test";

/**
 * 007-representante-menor: un paciente menor de edad puede no tener cédula propia — en ese
 * caso queda a cargo de un representante (adulto), cuyo nombre y cédula se guardan como
 * texto libre, sin validarse contra otros pacientes.
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

test.describe("Representante de un paciente sin documento propio (007-representante-menor)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("el checkbox se auto-marca al ingresar una fecha de nacimiento de un menor de 12 años", async ({
    page,
  }) => {
    await page.goto("/pacientes/nuevo");
    await expect(page.getByLabel("Tiene representante")).not.toBeChecked();
    await page.getByLabel("Fecha de nacimiento").fill("2022-01-01");
    await expect(page.getByLabel("Tiene representante")).toBeChecked();
  });

  test("no se auto-marca para una fecha de nacimiento de un adulto", async ({ page }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Fecha de nacimiento").fill("1990-01-01");
    await expect(page.getByLabel("Tiene representante")).not.toBeChecked();
  });

  test("crea un paciente sin documento propio si tiene representante, y la ficha lo muestra", async ({
    page,
  }) => {
    const sufijo = Date.now();
    const nombre = `Nino Representado ${sufijo}`;
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill(nombre);
    await page.getByLabel("Fecha de nacimiento").fill("1995-01-01");
    // Adulto por fecha de nacimiento: el checkbox no se auto-marca, se marca a mano.
    await page.getByLabel("Tiene representante").check();
    await page.getByLabel("Nombre del representante").fill("María Representante");
    await page.getByLabel("Cédula del representante").fill("V-12345678");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();

    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    await expect(page.getByText("María Representante")).toBeVisible();
    await expect(page.getByText("V-12345678")).toBeVisible();
    // Sin documento propio, el campo Documento se muestra como "—" en la ficha.
    await expect(page.getByText("—", { exact: true })).toBeVisible();
  });

  test("bloquea el guardado si no hay documento propio ni representante", async ({ page }) => {
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill(`Sin Nada ${Date.now()}`);
    await page.getByLabel("Fecha de nacimiento").fill("1990-01-01");
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await expect(page.getByText(/documento de identidad es obligatorio/i)).toBeVisible();
  });

  test("desmarcar el checkbox vuelve a exigir el documento propio", async ({ page }) => {
    const sufijo = Date.now();
    await page.goto("/pacientes/nuevo");
    await page.getByLabel("Nombre completo").fill(`Reversión ${sufijo}`);
    await page.getByLabel("Fecha de nacimiento").fill("2022-01-01");
    await expect(page.getByLabel("Tiene representante")).toBeChecked();
    await page.getByLabel("Tiene representante").uncheck();
    await page.getByRole("button", { name: /crear paciente|creando/i }).click();
    await expect(page.getByText(/documento de identidad es obligatorio/i)).toBeVisible();
  });
});
