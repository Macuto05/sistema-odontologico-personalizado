import { test, expect } from "@playwright/test";

/**
 * Escenario 1 de quickstart.md (002-pantalla-inicio) — requiere: servidor corriendo
 * (npm run build && npm run start), PostgreSQL con la migración de `nombre` aplicada, y
 * la cuenta sembrada por prisma/seed.ts. Variables de entorno de la cuenta de prueba:
 * E2E_ODONTOLOGO_EMAIL / E2E_ODONTOLOGO_PASSWORD / E2E_ODONTOLOGO_NOMBRE (deben coincidir
 * con las usadas al sembrar).
 *
 * El caso de "0 pacientes activos" (FR-003) no se ejercita acá con datos reales: la
 * cuenta sembrada ya tiene pacientes de otros escenarios de e2e, y vaciarla rompería esos
 * tests. Se valida manualmente per quickstart.md (paso 3), con una cuenta/BD limpia.
 */

const EMAIL = process.env.E2E_ODONTOLOGO_EMAIL ?? "e2e-tests@example.com";
const PASSWORD = process.env.E2E_ODONTOLOGO_PASSWORD ?? "PruebaE2E2026!";
const NOMBRE = process.env.E2E_ODONTOLOGO_NOMBRE ?? "Odontólogo de Prueba";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/");
}

test.describe("Resumen de bienvenida del inicio (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("saluda con el nombre del odontólogo (FR-001)", async ({ page }) => {
    // Acotado al encabezado: la tarjeta de perfil de la sidebar (004-consultorios,
    // rediseño de la sidebar) también muestra el nombre, así que un getByText genérico
    // matchea dos elementos.
    await expect(page.getByRole("heading", { name: new RegExp(NOMBRE) })).toBeVisible();
  });

  test("el conteo de activos del inicio coincide con el total real (FR-002)", async ({ page }) => {
    await page.goto("/");
    // Se compara contra la API (fuente de verdad) en el mismo instante, con reintento:
    // hay otros specs de e2e creando pacientes en paralelo, así que el número real puede
    // cambiar entre el momento en que se lee y el momento en que Dexie termina de
    // reflejarlo en el inicio — no una comparación entre dos navegaciones separadas.
    await expect(async () => {
      const respuesta = await page.request.get("/api/patients?estado=ACTIVO");
      const cuerpo = await respuesta.json();
      await expect(page.getByTestId("total-pacientes-activos")).toHaveText(
        String(cuerpo.pacientes.length),
      );
    }).toPass({ timeout: 20_000 });
  });
});
