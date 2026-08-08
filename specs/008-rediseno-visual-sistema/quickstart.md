# Quickstart: Rediseño visual del sistema (estilo mockup DentalPro)

## Prerrequisitos

- Servidor de desarrollo corriendo: `npm run dev`
- Sesión iniciada como odontólogo de prueba

## Validación manual

1. Ir a `/pacientes` con la sidebar expandida (estado por defecto).
   - **Esperado**: la barra superior (buscador + engranaje + "+Nuevo paciente") llega hasta
     el borde derecho de la ventana, sin franja en blanco a la derecha.
   - **Esperado**: el listado de pacientes está pegado al borde derecho de la sidebar, sin
     espacio en blanco a la izquierda.
2. Colapsar la sidebar con el botón de flecha.
   - **Esperado**: tanto la barra superior como el listado se desplazan hacia la izquierda en
     conjunto, con una transición suave (no un salto).
   - **Esperado**: no aparece espacio en blanco en ningún punto de la transición ni al final.
3. Expandir la sidebar de nuevo.
   - **Esperado**: mismo comportamiento en reversa — sin desalineación entre barra superior y
     listado.
4. Inspeccionar visualmente el ícono junto a "+Nuevo paciente".
   - **Esperado**: un único engranaje reconocible, sin líneas ni círculo adicionales
     superpuestos.
5. Inspeccionar visualmente el botón "+Nuevo paciente".
   - **Esperado**: texto blanco sin subrayado, sin cambiar a color de enlace visitado.
6. Repetir los pasos 1–3 en viewport de tablet (~800px) y de celular (~375px), usando las
   herramientas de desarrollo del navegador.
   - **Esperado**: en tablet, la sidebar angosta (64px) y el contenido siguen alineados sin
     espacio en blanco. En celular, la sidebar pasa a barra inferior y el contenido ocupa todo
     el ancho — sin restos de `margin-left` de escritorio.
7. Confirmar que el listado de Pacientes se comporta exactamente igual que antes de esta
   ronda: mismas 6 columnas (Nombre completo, Documento, Edad, Teléfono, Consultorio, Última
   visita), paginación funcional, búsqueda funcional, switch Activos/Archivados funcional.

## Validación automatizada

- `npx tsc --noEmit` — sin errores de tipos.
- `npx eslint .` — sin warnings nuevos.
- `npx vitest run` — suite unitaria completa en verde (sin regresiones).
- `npx playwright test tests/e2e/layout-sidebar-topappbar.spec.ts` — nueva prueba e2e que
  cubre: colapsar/expandir la sidebar desde `/pacientes` y verificar que `TopAppBar` y el
  contenido principal reportan el mismo desplazamiento horizontal en todo momento (por
  ejemplo, comparando `getBoundingClientRect().left` de ambos contra el ancho real de la
  sidebar en cada estado).
- `npx playwright test tests/e2e/pacientes*.spec.ts` — suites e2e existentes de Pacientes,
  deben seguir pasando sin modificación (confirma SC-004: comportamiento funcional intacto).

## Documentación

- Confirmar que `docs/design-system.md` tiene una nueva sección versionada con: paleta de
  colores (hex), tipografía, sombras, y los 4 patrones de componente nuevos, más una tabla de
  "pantallas migradas vs. pendientes".
- Confirmar que el número de versión y la entrada de changelog de `docs/design-system.md`
  fueron incrementados siguiendo el formato ya usado en el documento.
