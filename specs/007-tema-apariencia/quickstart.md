# Quickstart: Tema de apariencia (Azul / Morado)

Guía para validar manualmente (o vía los tests automatizados de `tasks.md`) que la feature
funciona de punta a punta, una vez implementada.

## Prerrequisitos

- Dependencias instaladas (`npm install`).
- Servidor de desarrollo corriendo: `npm run dev`.
- Sesión iniciada (la app requiere autenticación — ver Auth.js en la constitución).

## Escenario 1 — Cambiar de Azul a Morado se aplica al instante (User Story 1, SC-001)

1. Entrar a `/configuracion`.
2. En la sección "Apariencia", hacer clic en el swatch "Morado".
3. **Esperado**: sin recargar la página, los botones primarios, enlaces y anillos de foco de
   la interfaz cambian de azul a morado en menos de 5 segundos (en la práctica, de forma
   imperceptible).
4. Navegar a otra pantalla (p. ej. `/`, Inicio) sin recargar.
5. **Esperado**: el tema morado se mantiene también fuera de Configuración.

## Escenario 2 — Los colores de estado no cambian con el tema (SC-002)

1. Con el tema morado activo (Escenario 1), provocar una alerta de error — por ejemplo,
   intentar "Cambiar contraseña" en Configuración con la contraseña actual incorrecta.
2. **Esperado**: la alerta se muestra en rojo (`--color-error`), no en morado ni en ningún
   tono derivado del tema.
3. Repetir con una acción que dispare una alerta de éxito (p. ej. guardar el perfil).
4. **Esperado**: la alerta se muestra en verde (`--color-success`), sin cambios por el tema.

## Escenario 3 — La preferencia persiste por navegador (User Story 2, SC-003)

1. Con el tema morado activo, recargar la página (F5) sobre `/configuracion`.
2. **Esperado**: el tema morado sigue activo inmediatamente después de la recarga (con, como
   máximo, el parpadeo de un frame ya documentado en spec.md como Edge Case aceptado).
3. Cerrar la pestaña/navegador y volver a abrir la app.
4. **Esperado**: el tema morado sigue activo.
5. Abrir la app en un navegador distinto (o una ventana de incógnito) con la misma cuenta.
6. **Esperado**: se ve el tema azul (predeterminado) — la preferencia no viajó, por diseño
   (FR-005).

## Escenario 4 — El swatch activo se distingue visualmente (User Story 3, SC-004)

1. Entrar a `/configuracion` con el tema azul activo (por defecto).
2. **Esperado**: el swatch "Azul" se ve marcado como seleccionado (borde/indicador) y el
   "Morado" no.
3. Hacer clic en "Morado".
4. **Esperado**: la marca de seleccionado se mueve de inmediato al swatch "Morado".

## Escenario 5 — Degradación sin `localStorage` (FR-008, Edge Case)

1. Con las herramientas de desarrollador del navegador, deshabilitar/bloquear `localStorage`
   para el sitio (o usar un modo de navegación privada estricto que lo restrinja).
2. Entrar a `/configuracion` y hacer clic en "Morado".
3. **Esperado**: el tema morado se aplica igual para la sesión actual (sin errores visibles
   en la interfaz); simplemente no se recordará en la próxima visita.

## Validación automatizada equivalente

- `tests/unit/useTema.test.ts` cubre los Escenarios 3 y 5 a nivel de hook (lectura/escritura
  de `localStorage`, valor por defecto ante ausencia/corrupción/bloqueo).
- `tests/e2e/tema-apariencia.spec.ts` cubre los Escenarios 1, 3 y 4 en un navegador real
  (Playwright), incluyendo recarga de página.
- El Escenario 2 no requiere un test nuevo: los tests existentes de alertas de éxito/error
  (p. ej. `tests/e2e/configuracion.spec.ts`) ya verifican esos colores por variante de
  `<Alert>`, no por tema — no hay interacción entre ambos a probar más allá de que el token
  de estado no está en la lista de tokens que el theming sobreescribe (ver research.md §1).
