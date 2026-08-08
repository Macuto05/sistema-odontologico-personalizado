import { test, expect, Page } from "@playwright/test";

/**
 * Escenario 4 de quickstart.md (004-consultorios) — valida la extensión del motor de sync
 * (research.md #1, #5, #6): Consultorio funciona offline y se sincroniza entre
 * "dispositivos" (dos contextos de navegador distintos, misma cuenta).
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

/** Fuerza un ciclo de sync inmediato sin esperar el intervalo de 30s (ver offline-sync.spec.ts). */
async function forzarSync(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
}

test.describe("Sincronización de Consultorio entre dispositivos (Polish)", () => {
  test("crear/asignar un consultorio offline sincroniza y se refleja en otro dispositivo, incluida la eliminación en cascada", async ({
    browser,
  }) => {
    const sufijo = Date.now();
    const consultorio = `Sede Sync E2E ${sufijo}`;
    const documento = `V9030${sufijo}`;
    const nombrePaciente = `Paciente Sync E2E ${sufijo}`;

    // --- Dispositivo A: crea el consultorio y el paciente sin conexión ---
    const contextoA = await browser.newContext();
    const dispositivoA = await contextoA.newPage();
    await iniciarSesion(dispositivoA);
    await dispositivoA.evaluate(() => navigator.serviceWorker.ready);
    await dispositivoA.reload();
    await dispositivoA.goto("/configuracion");
    await dispositivoA.reload();
    await dispositivoA.goto("/pacientes/nuevo");
    await dispositivoA.reload();

    await contextoA.setOffline(true);

    await dispositivoA.goto("/configuracion");
    await dispositivoA.getByLabel("Nombre del consultorio").fill(consultorio);
    await dispositivoA.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(dispositivoA.getByText(consultorio)).toBeVisible();

    await dispositivoA.goto("/pacientes/nuevo");
    await dispositivoA.getByLabel("Nombre completo").fill(nombrePaciente);
    await dispositivoA.getByLabel("Documento de identidad").fill(documento);
    await dispositivoA.getByLabel("Fecha de nacimiento").fill("1994-05-05");
    await dispositivoA.getByLabel("Consultorio").selectOption({ label: consultorio });
    await dispositivoA.getByRole("button", { name: /crear paciente|creando/i }).click();
    await dispositivoA.waitForURL(/\/pacientes(\/|$)/);

    await contextoA.setOffline(false);
    await forzarSync(dispositivoA);

    // El consultorio y la asignación deben llegar al servidor.
    await expect(async () => {
      const respuesta = await dispositivoA.request.get(`/api/patients?q=${documento}`);
      const cuerpo = await respuesta.json();
      expect(cuerpo.pacientes).toHaveLength(1);
      expect(cuerpo.pacientes[0].consultorioId).toBeTruthy();
    }).toPass({ timeout: 15_000 });

    // --- Dispositivo B: mismo usuario, nunca creó este consultorio localmente ---
    const contextoB = await browser.newContext();
    const dispositivoB = await contextoB.newPage();
    await iniciarSesion(dispositivoB);
    await dispositivoB.goto("/configuracion");
    await forzarSync(dispositivoB);
    await expect(dispositivoB.getByText(consultorio)).toBeVisible({ timeout: 15_000 });

    // Lo elimina desde el dispositivo B.
    await dispositivoB.getByRole("button", { name: `Eliminar ${consultorio}` }).click();
    await expect(dispositivoB.getByText(consultorio)).not.toBeVisible();
    await forzarSync(dispositivoB);

    // --- De vuelta en el dispositivo A: el paciente debe quedar "Sin consultorio" ---
    await dispositivoA.goto("/pacientes");
    await forzarSync(dispositivoA);
    await dispositivoA.getByLabel("Buscar por nombre o documento").fill(nombrePaciente);
    await expect(dispositivoA.locator("tr", { hasText: nombrePaciente })).toContainText(
      "Sin consultorio",
      { timeout: 15_000 },
    );

    await contextoA.close();
    await contextoB.close();
  });

  test("nombre duplicado creado en dos dispositivos offline no termina duplicado en el servidor", async ({
    browser,
  }) => {
    const sufijo = Date.now();
    const nombreDuplicado = `Sede Duplicada E2E ${sufijo}`;

    const contextoA = await browser.newContext();
    const dispositivoA = await contextoA.newPage();
    await iniciarSesion(dispositivoA);
    await dispositivoA.evaluate(() => navigator.serviceWorker.ready);
    await dispositivoA.reload();
    await dispositivoA.goto("/configuracion");
    await dispositivoA.reload();

    const contextoB = await browser.newContext();
    const dispositivoB = await contextoB.newPage();
    await iniciarSesion(dispositivoB);
    await dispositivoB.evaluate(() => navigator.serviceWorker.ready);
    await dispositivoB.reload();
    await dispositivoB.goto("/configuracion");
    await dispositivoB.reload();

    await contextoA.setOffline(true);
    await contextoB.setOffline(true);

    await dispositivoA.getByLabel("Nombre del consultorio").fill(nombreDuplicado);
    await dispositivoA.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(dispositivoA.getByText(nombreDuplicado)).toBeVisible();

    await dispositivoB.getByLabel("Nombre del consultorio").fill(nombreDuplicado);
    await dispositivoB.getByRole("button", { name: "Agregar consultorio" }).click();
    await expect(dispositivoB.getByText(nombreDuplicado)).toBeVisible();

    await contextoA.setOffline(false);
    await contextoB.setOffline(false);
    await forzarSync(dispositivoA);
    await forzarSync(dispositivoB);
    // El segundo en llegar puede necesitar un reintento — el motor de sync no descarta la
    // operación (Principio III), pero tampoco reintenta antes del intervalo de 30s salvo
    // que se le vuelva a pedir explícitamente.
    await dispositivoA.waitForTimeout(500);
    await dispositivoB.waitForTimeout(500);
    await forzarSync(dispositivoA);
    await forzarSync(dispositivoB);

    await expect(async () => {
      const respuesta = await dispositivoA.request.get("/api/consultorios");
      const cuerpo = await respuesta.json();
      const coincidencias = cuerpo.consultorios.filter((c: { nombre: string }) => c.nombre === nombreDuplicado);
      expect(coincidencias).toHaveLength(1);
    }).toPass({ timeout: 15_000 });

    await contextoA.close();
    await contextoB.close();
  });
});
