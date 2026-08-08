# Research: Tema de apariencia (Azul / Morado)

## 1. Tonos exactos de la escala `--color-purple-*`

**Decision**: usar `#6D28D9` como `--color-purple-700` (base del tema, análoga a
`--color-cyan-700` como `--color-primary` actual), con el siguiente set completo:

| Token | Hex | Uso previsto (paralelo a `cyan`) |
|---|---|---|
| `--color-purple-50` | `#F5F3FF` | reservado, paralelo a `cyan-50` (no usado por `--color-info*`, que no cambia con el tema) |
| `--color-purple-600` | `#7C3AED` | `--color-primary-accent`, `--color-ring` |
| `--color-purple-700` | `#6D28D9` | `--color-primary` (relleno de botones/CTA) |
| `--color-purple-800` | `#5B21B6` | `--color-primary-hover` |
| `--color-purple-900` | `#4C1D95` | `--color-primary-active` |

**Rationale**: se valida contraste contra `--color-primary-foreground: white` (texto blanco
sobre botones rellenos), el mismo requisito que ya aplica a `cyan-700` (Principio VI: "mínimo
ratio de contraste"). Cálculo de luminancia relativa (WCAG 2.1):

- `cyan-700` (`#0E7490`) vs. blanco → contraste ≈ **5.35:1** (pasa AA normal-text ≥4.5:1, no
  llega a AAA ≥7:1) — este es el piso ya aceptado hoy en producción.
- `purple-700` (`#6D28D9`) vs. blanco → contraste ≈ **7.10:1** (pasa AA y AAA) — más seguro
  que el baseline actual, ningún ajuste adicional necesario.

**Alternatives considered**:
- Usar `#8B5CF6` (el tono que el usuario confirmó visualmente como más cercano a la imagen
  de referencia) directamente como `--color-primary`: se descartó porque, a diferencia de
  `#6D28D9`, pesa visualmente más claro que `cyan-700` (menor saturación/luminancia), lo que
  haría que los botones morados se vean "más débiles" que los azules actuales al lado a
  lado. Se conserva como `--color-purple-600` (un paso más claro, para acento/ring), que es
  el rol tonal equivalente a donde hoy vive `cyan-600`.
- Generar la escala completa 50–900 (10 pasos) como las paletas de Tailwind: se descartó
  porque ninguna escala existente en el proyecto (`cyan`, `teal`, `amber`) tiene más de 5
  pasos — se sigue el mismo patrón "solo los pasos que se usan" (Principio V).

## 2. Dónde aplicar `data-theme` para que el tema persista en toda la app (no solo en Configuración)

**Decision**: crear un componente `TemaBootstrap` (sin salida visual, `return null`) que
invoca `useTema()` y, en un `useEffect`, hace `document.documentElement.dataset.theme = tema`.
Se monta una sola vez dentro de `src/app/providers.tsx`, junto al ya existente
`SyncEngineBootstrap`:

> **Corrección post-implementación**: la primera versión de `useTema` usaba `useState` local
> por instancia — funcionaba en el test unitario del hook (una sola instancia por test), pero
> el test e2e del Escenario 1 detectó que `TemaBootstrap` y la sección "Apariencia" de
> Configuración, al ser dos instancias distintas del hook, no compartían estado: `setTema` en
> una no se reflejaba en la otra, así que el clic en el swatch nunca llegaba a `<html>`. Se
> corrigió con un store a nivel de módulo expuesto vía `useSyncExternalStore` (ver
> `data-model.md`) — sigue sin agregar ninguna dependencia nueva ni un `Context` propio, solo
> cambia *dónde* vive el estado (módulo compartido en vez de por-instancia).

```tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SyncEngineBootstrap />
      <TemaBootstrap />
      {children}
    </SessionProvider>
  );
}
```

**Rationale**: `Providers` envuelve toda la app desde `src/app/layout.tsx` (login incluido),
así que es el único punto que garantiza que el tema se aplique sin importar en qué pantalla
esté el usuario al cargar o navegar. Aplicar el efecto solo dentro de
`configuracion/page.tsx` haría que el tema se "olvidara" visualmente en cuanto el usuario
navegara a otra pantalla y recargara, violando FR-004. El patrón (componente sin render que
solo ejecuta un efecto de arranque) ya existe en el código (`SyncEngineBootstrap`), así que no
se introduce un patrón nuevo.

**Alternatives considered**:
- Poner el efecto directamente en `RootLayout` (`src/app/layout.tsx`): descartado porque ese
  archivo es un Server Component (no puede usar hooks) y convertirlo a cliente rompería el
  render de `<Metadata>`/`<Viewport>` que hoy depende de que sea servidor.
- Usar un script inline (`<script>` antes de la hidratación) para evitar el parpadeo de un
  frame al aplicar el tema guardado: descartado por consistencia con el precedente ya
  aceptado de `sidebar-colapsada` (mismo trade-off, documentado como Edge Case en spec.md) y
  porque introduce una segunda forma de leer preferencias de usuario en el proyecto.

## 3. El ítem activo de la Sidebar reutiliza `--color-info-bg` + `--color-primary`

> **Superada (mismo día, feedback directo del odontólogo tras probar el tema morado)**: la
> decisión de "aceptar" este fondo fijo resultó incorrecta en la práctica — se veía como un
> bug ("la sombra sigue azul"), no como un detalle cosmético menor. Se agregó
> `--color-primary-bg` y se aplicó acá, en `Tabs` (§6.10) y en el hover del botón "Editar" de
> la ficha (§6.12) — ver `docs/design-system.md` §3.2.1 (Historial 1.21.0) para el detalle
> completo. Esta sección queda como registro de por qué se consideró la alternativa "más
> simple" primero, no como la decisión vigente.

**Contexto**: `docs/design-system.md` §6.8 documenta que el ítem de navegación activo en la
Sidebar usa fondo `--color-info-bg` (hoy = `cyan-50`) y texto/ícono `--color-primary`,
reutilizando el token de "info" en vez de inventar un token nuevo (decisión ya tomada en
`001-gestion-pacientes`). Como `spec.md` (FR-006, decisión explícita del usuario) fija que
`--color-info*` **no** cambia con el tema, con el tema morado activo el ítem de navegación
activo quedaría con fondo cyan claro + texto morado.

**Decision**: aceptar esta combinación tal cual para esta iteración — no se introduce un
token nuevo (p. ej. `--color-primary-bg`) para el fondo del ítem activo.

**Rationale**: introducir un token de "fondo tintado del primario" es exactamente el tipo de
abstracción especulativa que el Principio V pide evitar cuando el caso de uso concreto
(este único lugar) no lo exige todavía, y el spec ya fijó explícitamente que solo la familia
`primary` + `ring` cambia — reabrir esa decisión para un solo componente secundario no está
en el alcance aprobado. El resultado (fondo cyan muy claro, texto morado) sigue siendo
legible (el fondo es un tinte pálido, no un color saturado que choque) y no compromete
contraste ni usabilidad; es una inconsistencia menor y cosmética, no un defecto funcional.

**Alternatives considered**:
- Agregar `--color-primary-bg` (tinte pálido derivado de `--color-primary`) y usarlo en vez
  de `--color-info-bg` para el ítem activo: rechazado por alcance (ver Rationale) — queda
  anotado acá como mejora futura si en algún momento se agregan más temas y la
  inconsistencia se vuelve más notoria.
