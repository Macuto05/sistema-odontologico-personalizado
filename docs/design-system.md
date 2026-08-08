# Sistema Odontológico — Design System

**Status**: v1.25.0 — fuente única de verdad para UI, requerida por el **Principio VI
(UI Consistency & Design System Discipline)** de [`.specify/memory/constitution.md`](../.specify/memory/constitution.md).

**Paleta**: definida junto al odontólogo (2026-07-30) — minimalista, azul/verde suaves sobre
grises y blancos. Ver sección 2.1 para las dos correcciones de contraste acordadas sobre la
propuesta original (el color base se conserva como acento; se agregó un tono hermano más
oscuro para texto/relleno donde el contraste lo exige).

**Alcance de esta versión**: cubre lo necesario para la primera feature
(`001-gestion-pacientes`: fichas, búsqueda, edición, archivado — formularios, tablas y
botones estándar). No incluye modo oscuro, animaciones avanzadas ni componentes que ninguna
feature planeada necesita todavía (odontograma, calendario de turnos, etc.) — se agregan
cuando una feature real los requiera, no antes (Principio V, Simplicidad/YAGNI).

**Agnóstico de stack**: el stack tecnológico del proyecto aún no está ratificado (ver
constitución, sección *Technology & Architecture Constraints*). Por eso los tokens se
definen como variables CSS conceptuales — cualquier stack que se elija (Tailwind config,
CSS-in-JS, styled-components, etc.) debe consumir estos mismos nombres y valores, no
reinventarlos.

---

## 1. Cómo usar este documento

- **Antes de crear un componente nuevo** (botón, input, modal, card, tabla, badge),
  revisar la sección 6 — si existe una variante que sirve, se reutiliza. No se crean
  "casi-duplicados" con estilos ligeramente distintos.
- **Antes de usar un color, tamaño de fuente o espaciado**, se usa un token de este
  documento — nunca un valor suelto (`#2563EB`, `13px`, `padding: 10px 18px`) escrito
  directamente en un componente o pantalla.
- **Para agregar un token nuevo** (ej. un color que falta): se agrega aquí primero, con su
  justificación, y luego se consume desde el código. Nunca al revés.
- Cualquier violación de estas reglas debe justificarse explícitamente en la revisión del
  cambio, igual que cualquier otra desviación de un Principio de la constitución.

---

## 2. Tokens primitivos

Valores crudos. Nadie los referencia directamente desde un componente — solo los tokens
semánticos (sección 3) lo hacen.

### 2.1 Color

Paleta minimalista definida con el odontólogo: azul calmado + verde suave sobre grises y
blancos. Dos ajustes de contraste, acordados explícitamente antes de fijarlos:

1. **Azul principal**: el tono elegido (`#0891B2`) da solo ~3.7:1 de contraste con texto
   blanco encima — por debajo del mínimo de 4.5:1 para texto normal (sección 4). Se agregó
   un hermano más oscuro (`#0E7490`, contraste 5.4:1) para botones/rellenos con texto
   blanco; el tono original se conserva para íconos, bordes y el anillo de foco.
2. **Verde de éxito**: el tono elegido (`#14B8A6`) da solo ~2.5:1 contra blanco — no
   alcanza ni el mínimo de 3:1 para íconos/bordes. Se agregó un hermano más oscuro
   (`#0F766E`, contraste 5.5:1) para texto e íconos de éxito; el tono original se conserva
   para superficies decorativas grandes (no para texto ni íconos finos).
3. **Ámbar de advertencia**: el rojo de error (`#DC2626`) sí cumple 4.5:1 tal cual, no
   necesitó ajuste. El ámbar (`#D97706`) cumple 3:1 (sirve para íconos/bordes) pero no
   4.5:1 — se agregó un hermano más oscuro (`#B45309`) para texto de advertencia.
4. **Morado — tema alternativo** (007-tema-apariencia, 2026-08-03): el usuario puede elegir
   un tema morado en vez del azul predeterminado (§3.2.1). Tono base `#6D28D9`, elegido a
   partir de una referencia visual del odontólogo (`#8B5CF6`) pero oscurecido un paso para
   igualar el peso visual de `--color-cyan-700` como relleno de botones. Contraste contra
   `--color-primary-foreground` (blanco): **7.10:1** (AAA) — más seguro que el 5.35:1 de
   `cyan-700`, sin necesidad de un segundo ajuste.
5. **Rediseño "mockup DentalPro"** (008-rediseno-visual-sistema, 2026-08-04, §6.20): la
   escala azul se reemplaza por una variante más oscura y saturada tipo Material 3
   (`--color-cyan-700: #00647C`, antes `#0E7490`), y los neutros pasan a un gris con un
   sesgo frío muy leve en vez de gris puro (`--color-slate-700: #3E484D`, antes `#334155`;
   `--color-slate-900: #171C1E`, antes `#0F172A`). Al ser más oscuro que el tono anterior que
   ya cumplía 4.5:1 contra blanco, el nuevo `cyan-700` mantiene ese mínimo sin necesidad de un
   ajuste adicional — se conserva el mismo patrón de "tono elegido + hermano oscuro para
   contraste" de los puntos 1–3, solo con valores más oscuros. Los tokens de éxito, error y
   advertencia (puntos 2–3) no cambian.

```css
:root {
  /* Grises (neutros) — actualizados en el rediseño "mockup DentalPro" con un sesgo frío
     muy leve en vez de gris puro (§2.1 punto 5) */
  --color-slate-50:  #F6FAFD;  /* antes #F8FAFC */
  --color-slate-100: #F0F4F7;  /* fondo general — antes #F1F5F9 */
  --color-slate-200: #DFE3E6;  /* antes #E2E8F0 */
  --color-slate-300: #CBD5E1;
  --color-slate-400: #94A3B8;
  --color-slate-500: #64748B;
  --color-slate-700: #3E484D;  /* texto principal — antes #334155 */
  --color-slate-900: #171C1E;  /* antes #0F172A */

  /* Azul principal — actualizado en el rediseño "mockup DentalPro" (§2.1 punto 5, §6.20) */
  --color-cyan-50:  #ECFEFF;
  --color-cyan-600: #0891B2;  /* acento, bordes, anillo de foco (sin cambios) */
  --color-cyan-700: #00647C;  /* relleno de botones con texto blanco — antes #0E7490 */
  --color-cyan-800: #00596F;  /* hover — antes #155E75 */
  --color-cyan-900: #003D52;  /* active/pressed — antes #164E63 */

  /* Verde de éxito — elegido + hermano oscuro para contraste */
  --color-teal-50:  #F0FDFA;
  --color-teal-500: #14B8A6;  /* elegido — solo superficies grandes/decorativas */
  --color-teal-700: #0F766E;  /* derivado — texto e íconos de éxito */

  /* Rojo de error — elegido, cumple contraste sin ajuste */
  --color-red-50:  #FEF2F2;
  --color-red-600: #DC2626;  /* elegido — texto, ícono y relleno */

  /* Ámbar de advertencia — elegido + hermano oscuro para texto */
  --color-amber-50:  #FFFBEB;
  --color-amber-600: #D97706;  /* elegido — ícono/borde/relleno con texto oscuro */
  --color-amber-700: #B45309;  /* derivado — texto de advertencia */

  /* Morado — tema alternativo (§3.2.1), mismos 5 pasos que la escala cyan. Derivado de
     #905CA2, el morado real de marca de la odontóloga (su talonario imprimible,
     RecetaImprimible.module.css) — antes un morado genérico sin relación con su
     papelería. 700 es la marca tal cual; 50/600/800/900 se derivaron ajustando L/S en
     HSL con los mismos deltas relativos que ya tenía la rampa genérica anterior, para
     no perder la progresión de tono entre pasos. */
  --color-purple-50:  #FAF6FB;
  --color-purple-600: #A865BE;  /* acento, anillo de foco — 3.98:1 sobre blanco */
  --color-purple-700: #905CA2;  /* relleno de botones con texto blanco — 4.95:1, pasa AA */
  --color-purple-800: #784E87;  /* hover — 6.49:1 */
  --color-purple-900: #62426D;  /* active/pressed — 8.34:1 */
}
```

### 2.2 Espaciado (base 4px)

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

Toda separación (padding, margin, gap) en cualquier pantalla **DEBE** tomar su valor de
esta lista. Si un espacio "casi encaja" pero no coincide con ningún token, se usa el token
más cercano — nunca un valor intermedio inventado (ej. `padding: 14px` está prohibido;
se usa `--space-3` (12px) o `--space-4` (16px)).

### 2.3 Tipografía

**Actualizado en el rediseño "mockup DentalPro"** (008-rediseno-visual-sistema, §6.20):
familia tipográfica **Inter** en vez de la sans-serif nativa del sistema — elegida porque es
la fuente del mockup de referencia del odontólogo y da un aspecto más consistente entre
dispositivos que depender de la fuente nativa de cada uno. Se carga vía `next/font/google`
(`src/app/layout.tsx`), que la autohospeda en build time — no es un `<link>` a Google Fonts
en runtime, por lo que sigue disponible offline una vez que el Service Worker cachea el
app-shell (Tecnología & Arquitectura de la constitución). Se conserva la lista de fallbacks
nativos por si la fuente todavía no cargó.

```css
:root {
  --font-family-base: var(--font-inter), system-ui, -apple-system, "Segoe UI", sans-serif;

  --font-size-xs:   0.75rem;   /* 12px — caption */
  --font-size-sm:   0.875rem;  /* 14px — body-sm / label */
  --font-size-base: 1rem;      /* 16px — body */
  --font-size-lg:   1.125rem;  /* 18px — subheading */
  --font-size-2xl:  1.5rem;    /* 24px — heading */
  --font-size-3xl:  1.875rem;  /* 30px — heading-lg (título de página) */
  --font-size-4xl:  2rem;      /* 32px — nuevo: título de página estilo bento (§6.20) */

  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  --leading-tight:  1.25;
  --leading-normal: 1.5;
}
```

### 2.4 Radio de borde y sombra

**Actualizado en el rediseño "mockup DentalPro"**: radios de borde más generosos y sombras
más suaves y difusas ("soft-saas") en vez de sombras chatas — refuerzan la sensación de
tarjetas flotando sobre el fondo que tiene el mockup, en vez de bordes marcados.

```css
:root {
  --radius-default: 0.375rem; /* 6px — inputs, badges (antes 4px) */
  --radius-md:      0.5rem;   /* 8px — botones (antes 6px) */
  --radius-lg:      0.75rem;  /* 12px — cards, modales, TopAppBar (antes 8px) */

  --shadow-sm: 0 2px 4px 0 rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
}
```

---

## 3. Tokens semánticos

Estos son los que se usan en componentes reales. Nunca un token primitivo directo.

### 3.1 Color — superficies y texto

```css
:root {
  --color-background: var(--color-slate-100);
  --color-foreground: var(--color-slate-700);

  --color-card: white;
  --color-card-foreground: var(--color-slate-700);

  --color-border: var(--color-slate-200);
  --color-input-border: var(--color-slate-300);
}
```

### 3.2 Color — semántico primario / secundario / neutro

```css
:root {
  --color-primary: var(--color-cyan-700);        /* relleno de botones/CTA */
  --color-primary-hover: var(--color-cyan-800);
  --color-primary-active: var(--color-cyan-900);
  --color-primary-foreground: white;
  --color-primary-accent: var(--color-cyan-600); /* íconos, bordes destacados */

  --color-secondary: var(--color-slate-200);
  --color-secondary-hover: var(--color-slate-300);
  --color-secondary-foreground: var(--color-slate-700);

  --color-muted: var(--color-slate-100);
  --color-muted-foreground: var(--color-slate-500);

  --color-ring: var(--color-cyan-600);
  --color-primary-bg: var(--color-cyan-50); /* fondo tintado — ítem activo, hover de acciones primarias */
}
```

#### 3.2.1 Tema de apariencia (Azul / Morado)

Desde `007-tema-apariencia`, el usuario puede elegir entre dos temas en Configuración. El
mecanismo es un atributo `data-theme` en `<html>` que reasigna **solo** los 6 tokens
semánticos de arriba — ningún otro token (superficies, tipografía, estados) cambia con el
tema:

```css
[data-theme="morado"] {
  --color-primary: var(--color-purple-700);
  --color-primary-hover: var(--color-purple-800);
  --color-primary-active: var(--color-purple-900);
  --color-primary-accent: var(--color-purple-600);
  --color-primary-bg: var(--color-purple-50);
  --color-ring: var(--color-purple-600);
}
```

Sin el atributo (o `data-theme="azul"`), rigen los valores de `:root` de arriba — azul sigue
siendo el predeterminado. `--color-primary-foreground` no cambia entre temas (blanco funciona
sobre ambos, ver contraste en §2.1). Los tokens de estado (§3.3) son deliberadamente
independientes del tema — una alerta de error es roja sin importar qué tema esté activo.

**Corrección post-lanzamiento** (mismo día, feedback directo del odontólogo tras probar el
tema morado): la primera versión de esta feature reutilizaba `--color-info-bg` para el fondo
tintado del ítem activo de la Sidebar (§6.8) y de la pestaña activa de `Tabs` (§6.10),
razonando que agregar un token nuevo para un solo caso de uso era la abstracción
especulativa que el Principio V pide evitar. En la práctica, esto se veía como un defecto —
"la sombra/el fondo del ítem seleccionado sigue azul con el tema morado activo" — porque
`--color-info-bg` es, para quien usa el sistema, indistinguible de "el tinte del color
primario", no un color de estado real. Se agregó `--color-primary-bg` (arriba) y se
reemplazó `--color-info-bg` por este token en los tres lugares que lo usaban para ese
propósito (Sidebar §6.8, Tabs §6.10, botón "Editar" de la ficha §6.12) — `--color-info-bg`
queda reservado exclusivamente para el `Alert`/aviso de tipo "info" (§6.7), que si debe
seguir siendo celeste sin importar el tema.

Cualquier tema nuevo que se agregue en el futuro sigue el mismo patrón: una escala de 5 pasos
en §2.1 (paralela a `cyan`/`purple`) + un bloque `[data-theme="..."]` acá, nunca tokens
sueltos fuera de este mecanismo.

#### 3.2.2 Color fijo, no themable — Odontograma

`--color-odontograma-azul` (= `--color-cyan-700`, arriba) es deliberadamente **el único
token semántico que el bloque `[data-theme="morado"]` no reasigna**. El Odontograma (§6.16)
usa una convención clínica cerrada de exactamente dos colores — rojo (`--color-error`) y
azul — para marcar hallazgos existentes; ese significado es parte del registro clínico del
paciente, no una preferencia de UI, así que debe verse igual sin importar qué tema eligió el
odontólogo para el resto del sistema. La primera versión de `007-tema-apariencia` reutilizaba
`--color-primary` para "azul" (documentado en su momento en §6.16, antes de que existiera un
segundo tema) — con el tema morado activo, hallazgos ya guardados con líneas/símbolos azules
se veían morados, un bug real detectado por el odontólogo, no solo un detalle estético. Este
token corrige eso: el Odontograma nunca debe leer `--color-primary`, `--color-primary-accent`
ni `--color-ring` para dibujar sus símbolos guardados (sí puede seguir usando `--color-ring`/
`--color-primary-accent` para estados de interacción del editor — hover, foco, "diente
seleccionado mientras se marca" — eso es UI de edición, no la marca clínica en sí, y sí debe
seguir el tema como el resto de la app).

### 3.3 Color — estados (éxito / error / advertencia)

```css
:root {
  --color-success: var(--color-teal-700);        /* texto, ícono */
  --color-success-accent: var(--color-teal-500); /* superficies grandes/decorativas */
  --color-success-bg: var(--color-teal-50);
  --color-success-foreground: white;              /* válido sobre teal-700, no sobre teal-500 */

  --color-error: var(--color-red-600);            /* texto, ícono y relleno */
  --color-error-bg: var(--color-red-50);
  --color-error-foreground: white;

  --color-warning: var(--color-amber-700);        /* texto de advertencia */
  --color-warning-accent: var(--color-amber-600); /* ícono/borde/relleno con texto oscuro */
  --color-warning-bg: var(--color-amber-50);
  --color-warning-foreground: var(--color-slate-900); /* usar sobre amber-600, no blanco */

  --color-info: var(--color-cyan-700);   /* reutiliza la familia del primario, no es un color nuevo */
  --color-info-bg: var(--color-cyan-50);
  --color-info-foreground: white;
}
```

**Esta es la paleta completa**, definida junto al odontólogo el 2026-07-30: primario
(cian, con morado como tema alternativo desde `007-tema-apariencia`, §3.2.1), estado de
éxito (verde/teal), error (rojo) y advertencia (ámbar), sobre neutros (slate) y blanco. No
se agregan colores nuevos (un "verde distinto", un "azul de marca" aparte) sin antes
actualizar esta sección con su justificación — incluyendo, si aplica, el cálculo de
contraste que justifique cualquier tono derivado.

### 3.4 Tipografía — jerarquía cerrada

| Estilo | Uso | Tamaño | Peso | Line-height |
|---|---|---|---|---|
| `heading-lg` | Título de página (ej. "Pacientes") | `--font-size-3xl` (30px) | semibold | tight |
| `heading` | Título de sección / encabezado de modal | `--font-size-2xl` (24px) | semibold | tight |
| `subheading` | Subtítulo, encabezado de card, nombre de paciente en ficha | `--font-size-lg` (18px) | medium | normal |
| `body` | Texto de contenido, valores de formulario, celdas de tabla | `--font-size-base` (16px) | normal | normal |
| `body-sm` | Etiquetas de campo, texto secundario | `--font-size-sm` (14px) | normal | normal |
| `caption` | Texto auxiliar, ayudas, timestamps, texto de error bajo un input | `--font-size-xs` (12px) | normal | normal |

No existen tamaños de fuente fuera de esta tabla. Si una pantalla "necesita" un tamaño
intermedio, se elige el estilo más cercano de la lista — no se inventa uno nuevo.

---

## 4. Accesibilidad y diseño responsive mínimo

Estos mínimos son parte del Principio VI y **no son opcionales**.

### 4.0 Breakpoints y comportamiento responsive

El sistema se usa en tablet (consultorio), escritorio/laptop y celular. **Ninguna pantalla
puede depender de un solo tamaño de ventana** — el layout se adapta en los tres rangos.

```css
:root {
  --breakpoint-sm: 640px;   /* celular grande / tablet chica en vertical */
  --breakpoint-md: 768px;   /* tablet */
  --breakpoint-lg: 1024px;  /* escritorio / laptop */
}
```

| Rango | Layout | Notas |
|---|---|---|
| `< 640px` (celular) | Una sola columna, todo apilado | Formularios: un campo por fila. Tablas (ej. listado de pacientes): se muestran como lista de tarjetas, una por paciente — nunca una tabla con scroll horizontal. |
| `640–1023px` (tablet) | Una o dos columnas según el espacio | Es el rango principal de uso (chairside); todos los tamaños de la sección 6 (botón/input 44px) están pensados primero para este rango. |
| `≥ 1024px` (escritorio/laptop) | Multi-columna, tabla completa | La tabla de pacientes se muestra como tabla real (sección 6.5); pueden coexistir listado + panel de detalle lado a lado. |

Reglas generales, sin excepción:
- Ninguna pantalla debe requerir scroll horizontal para ver su contenido principal.
- El tamaño mínimo de área clickeable (44×44px, ver 4.1) se respeta en **los tres** rangos —
  en escritorio con mouse puede haber además estados `hover`, pero el tamaño no se achica.
- Modales (sección 6.4): ocupan pantalla completa por debajo de `640px`; se muestran
  centrados con ancho máximo (`sm`/`default`/`lg`) a partir de `640px`.
- Ningún componente del inventario (sección 6) se considera terminado si solo fue pensado
  para un rango — debe funcionar en los tres antes de darse por válido.

### 4.1 Contraste y áreas táctiles

| Elemento | Requisito |
|---|---|
| Texto normal sobre fondo | Contraste mínimo 4.5:1 |
| Texto grande (≥18px) o texto en negrita ≥14px | Contraste mínimo 3:1 |
| Bordes de componentes interactivos (input, botón) | Contraste mínimo 3:1 contra el fondo |
| Indicador de foco (`:focus-visible`) | Visible siempre; contraste mínimo 3:1 |
| Área clickeable de cualquier control táctil (botón, ítem de lista, ícono de acción) | Mínimo **44×44px**, incluyendo el padding — no solo el contenido visible |

**Por qué 44×44px y no 40px (el "default" genérico de un design system típico)**: este
sistema se usa en tablet en el consultorio, a menudo con el odontólogo tocando la pantalla
entre pacientes sin mucha precisión. Por eso, en este proyecto **el tamaño `default` de
Button e Input se fija en 44px de alto**, no en 40px — ver sección 6.1 y 6.2.

Reglas adicionales:
- Ningún estado (activo/archivado, éxito/error) se comunica **solo** con color — siempre
  se acompaña de texto o un ícono (ej. un badge "Archivado" con texto, no solo un punto
  gris).
- Todo campo de formulario obligatorio se marca con texto ("Requerido") además de
  cualquier indicador visual.
- Los mensajes de error de un campo usan `--color-error` + texto (`role="alert"` a nivel de
  implementación), nunca solo un borde rojo.

---

## 6. Inventario de componentes reutilizables

Cobertura mínima para `001-gestion-pacientes`. Antes de programar un componente nuevo,
buscar aquí primero.

### 6.1 Button

**Variantes**

| Variante | Fondo | Texto | Uso |
|---|---|---|---|
| `primary` | `--color-primary` | white | Acción principal (ej. "Guardar paciente") |
| `secondary` | `--color-secondary` | `--color-secondary-foreground` | Acción secundaria (ej. "Cancelar") |
| `outline` | transparente | `--color-foreground` | Acción terciaria, con borde `--color-border` |
| `destructive` | `--color-error` | white | Acción irreversible o de riesgo (ej. confirmar archivado) |

**Tamaños** (alto ya ajustado para uso táctil en tablet, ver sección 4.1)

| Tamaño | Alto | Padding horizontal | Fuente |
|---|---|---|---|
| `sm` | 36px | `--space-3` | `body-sm` |
| `default` | **44px** | `--space-4` | `body` |
| `lg` | 52px | `--space-6` | `body` |

**Estados**: `default`, `hover` (un tono más oscuro), `active` (dos tonos más oscuro),
`focus` (ring de `--color-ring`), `disabled` (opacidad 0.5, `cursor: not-allowed`).
Prioridad cuando coinciden: `disabled` > `active` > `focus` > `hover` > `default`.

### 6.2 Input (texto, fecha, teléfono, email, textarea, select)

| Tamaño | Alto | Padding | Fuente |
|---|---|---|---|
| `default` | **44px** | `--space-2` `--space-3` | `body` |

**Estados**: `default` (borde `--color-input-border`), `hover` (borde `--color-slate-400`),
`focus` (borde `--color-primary` + ring `--color-ring` al 20% opacidad), `error` (borde
`--color-error` + ring `--color-error` al 20%, con texto de error en `caption` debajo),
`disabled` (fondo `--color-muted`, texto `--color-muted-foreground`).

**Anatomía**: label (`body-sm`) → campo → texto de ayuda o error (`caption`).

**Select** (`src/components/ui/Select.tsx`): mismos tokens y estados que Input arriba —
mismo alto, bordes, foco y error — con una flecha decorativa a la derecha
(`--color-muted-foreground`, `aria-hidden`). Usado para campos de opción cerrada, ej.
Género en el alta/edición de paciente.

**Checkbox** (`src/components/ui/Checkbox.tsx`, `003-historia-clinica-paciente`): fila de
label + casilla nativa (`accent-color: --color-primary`), foco con el mismo ring de 20% de
opacidad que Input/Select, fila completa con `min-height: 44px` como área táctil (§4.1) —
no solo la casilla en sí. Usado para el checklist de 21 antecedentes personales
patológicos (§6.11).

**Textarea** (`src/components/ui/Textarea.tsx`, `003-historia-clinica-paciente`): variante
multilínea de Input — mismos tokens de borde/foco/error/label, `min-height: 88px`,
redimensionable verticalmente. Usado para heredofamiliares, medicamentos actuales y
alergias (§6.11).

### 6.3 Card

Usada para agrupar la ficha de un paciente o una sección de un formulario.

| Área | Padding |
|---|---|
| header | `--space-6` `--space-6` `0` |
| content | `--space-6` |
| footer | `0` `--space-6` `--space-6` |
| gap entre secciones | `--space-4` |

Fondo `--color-card`, borde `--color-border`, radio `--radius-lg`, sombra `--shadow-sm`
(sin sombra en reposo si `variant="outline"`).

### 6.4 Modal / Dialog

Usado para: confirmar archivado, confirmar reactivación, avisar de documento duplicado.

| Tamaño | Ancho máximo | Uso |
|---|---|---|
| `sm` | 400px | Confirmaciones simples (archivar, reactivar, aviso de duplicado) |
| `default` | 560px | Formularios cortos dentro de un modal |

**Anatomía**: header (título `heading` + botón cerrar) → content → footer (acciones
alineadas a la derecha, botón `secondary`/`outline` para cancelar + `primary` o
`destructive` para confirmar, en ese orden).

**Responsive** (ver 4.0): por debajo de `640px` el modal ocupa toda la pantalla (sin ancho
máximo); a partir de `640px` se centra con el ancho máximo de su tamaño.

### 6.5 Table (listado de pacientes)

Tabla semántica real (`<table><thead>/<tbody>`), no `<div role="table">` — mejor soporte de
lectores de pantalla (§4.1).

**Estilo "tabla moderna"** (actualizado en 008-rediseno-visual-sistema, §6.20):

| Elemento | Valor |
|---|---|
| Alto de fila | 48px (default) |
| Padding de celda | `--space-4` en todos los lados (antes `--space-3`/`--space-4` asimétrico) |
| Alineación texto | izquierda |
| Encabezado | fondo `rgba(0,0,0,0.02)`, texto en mayúsculas (`text-transform: uppercase`), `letter-spacing: 0.02em`, `caption`/`--color-muted-foreground` en negrita |
| Borde de celda | `rgba(0,0,0,0.08)` (en vez de `--color-border` sólido — más sutil) |
| Fila en hover | fondo `rgba(0, 100, 124, 0.04)` (tinte de `--color-primary`, no gris neutro) |
| Contenedor | `--radius-lg`, `--shadow-sm`, `overflow: hidden` — la tabla "flota" como una tarjeta en vez de ser un elemento plano en la página |

**Columnas del listado de pacientes** (`001-gestion-pacientes`, actualizadas en
008-rediseno-visual-sistema tras feedback directo del odontólogo sobre qué necesita ver de
un vistazo):

| Columna | Contenido |
|---|---|
| Nombre completo | Avatar (§6.9) + nombre completo, como enlace a la ficha (`--color-primary`, sin subrayado) |
| Documento | `documentoIdentidad` formateado para mostrar (`V-29.838.893` — `formatearDocumentoIdentidad`) |
| Edad | calculada desde `fechaNacimiento` (`calcularEdad`) |
| Teléfono | tal cual se guardó, sin máscara; `—` si no tiene |
| Consultorio | nombre del consultorio asignado; `"Sin consultorio"` si no tiene |
| Última visita | fecha (sin hora) de la Cita `FINALIZADA` más reciente — `formatearFecha`; `—` si nunca tuvo ninguna |

No incluye columnas de Estado ni Acciones: Estado es redundante con las pestañas
Activos/Archivados (§6.10) que ya dejan sin ambigüedad qué se está viendo, y Acciones no
tiene contenido que agregar valor sobre hacer clic en la fila para ir a la ficha.

**Paginación** (research.md #11): tamaño de página fijo en 10. Pie de la tabla con
"Mostrando X a Y de Z pacientes" (`body-sm`, `--color-muted-foreground`) a la izquierda y
controles prev/números de página/next a la derecha — mismos `Button` variante `outline`
tamaño `sm` (§6.1) para cada control, el de la página activa en variante `primary`.

**Responsive** (ver 4.0): esta especificación aplica a partir de `1024px` (escritorio). Por
debajo de `1024px` cada fila se muestra como una tarjeta (sección 6.3) con los mismos
datos, apiladas verticalmente — nunca la tabla con scroll horizontal. El pie de paginación
se apila (texto arriba, controles abajo, centrados) en ese rango.

### 6.6 Badge

Usado para el estado del paciente (`Activo` / `Archivado`) y del insumo (`En stock` /
`A reponer` / `Archivado`).

| Variante | Fondo | Texto | Uso |
|---|---|---|---|
| `success` | `--color-success-bg` | `--color-success` | Activo, En stock |
| `muted` | `--color-muted` | `--color-muted-foreground` | Archivado |
| `warning` | `--color-warning-bg` | `--color-warning` | A reponer (stock ≤ mínimo) |

Tamaño único: padding `--space-1` `--space-2`, fuente `caption`, radio `--radius-default`.
Siempre acompañado del texto del estado (ver regla de accesibilidad, sección 4.1) — nunca
solo un punto de color.

La variante `warning` se agregó en `010-gestion-insumos` (FR-005) reutilizando los tokens
semánticos de advertencia que ya existían — no introdujo ningún color nuevo. Se usa para
estados de **alerta de negocio que requieren acción del odontólogo** (reponer stock), no
para errores de validación: esos siguen siendo `Alert variant="error"` (§6.7).

### 6.7 Alert / mensaje inline

Usado para el aviso de "ya existe un paciente con este documento" (FR-004 de
`001-gestion-pacientes`) y confirmaciones de guardado.

| Variante | Fondo | Borde | Uso |
|---|---|---|---|
| `error` | `--color-error-bg` | `--color-error` | Documento duplicado, error de validación |
| `success` | `--color-success-bg` | `--color-success` | Guardado exitoso |
| `info` | `--color-info-bg` | `--color-info` | Aviso neutro |

### 6.8 Sidebar / Navegación

Menú de navegación principal del sistema autenticado, visible desde el inicio
(`002-pantalla-inicio`, FR-004). Es la única sidebar del sistema; se define acá antes de
programarla (Principio VI). De arriba abajo:

1. **Logo**: logo real de la clínica (`public/logo-diente.png`, `Sidebar.tsx`) + texto
   "Dental System" — reemplaza al ícono placeholder cuadrado con fondo `--color-primary`
   que tenía antes. Sin badge de color propio: el logo ya trae su propia identidad
   (línea morada), se muestra directo sobre el fondo de la sidebar (`--color-card`),
   34×40px (`object-fit: contain`, respeta la proporción original del archivo).
2. **Navegación**: Inicio, Pacientes, Insumos.
3. **Pie**: tarjeta de perfil (círculo con la inicial del nombre del odontólogo + nombre +
   "Odontólogo/a"), que lleva a Configuración — no hay foto de perfil en esta feature, la
   inicial es el placeholder. Debajo, "Cerrar sesión".

**Estructura de cada ítem de navegación**: ícono + etiqueta de texto. Nunca solo ícono sin
equivalente accesible — en el colapso de tablet (ver abajo) la etiqueta pasa a
`aria-label`/tooltip, no desaparece (regla de accesibilidad §4.1). "Cerrar sesión" usa
`--color-error` (acción de riesgo, mismo criterio que `Button` variante `destructive`,
§6.1) — sigue llevando ícono + texto, el color nunca es el único indicador (§4.1).

**Ítem activo — actualizado en el rediseño "mockup DentalPro"** (008-rediseno-visual-sistema,
§6.20): borde derecho sólido de 4px en `--color-primary` + fondo `rgba(0,100,124,0.08)`,
texto/ícono `--color-primary` — reemplaza el patrón anterior de fondo `--color-primary-bg` +
resplandor (`box-shadow` con `--color-ring`), siguiendo el estilo Material 3 del mockup. El
resto de los ítems (inactivos) usa `--color-muted-foreground`, no `--color-foreground` —
consistente con que el ítem activo es el único con color de acento.

**Comportamiento responsive** (obligatorio, sección 4.0):

| Rango | Layout de la sidebar |
|---|---|
| `< 640px` (celular) | Colapsa a una barra de navegación inferior fija: los 3 ítems de navegación distribuidos en el ancho (ícono + etiqueta corta debajo), y a la derecha el ícono de "Cerrar sesión" solo (sin texto) — el logo y la tarjeta de perfil no se muestran en este rango. |
| `640–1023px` (tablet) | Sidebar lateral angosta (`64px`), solo íconos con `aria-label` como equivalente accesible de la etiqueta; el texto del logo y de la tarjeta de perfil se ocultan visualmente (siguen accesibles). |
| `≥ 1024px` (escritorio/laptop) | Sidebar lateral completa (ícono + etiqueta de texto), ancho fijo de `256px` (antes `208px` — ajustado en el rediseño "mockup DentalPro" para dar más aire al logo/texto). |

**Colores y espaciado** (reutiliza tokens ya existentes — no se agrega ninguno nuevo):

| Elemento | Token |
|---|---|
| Fondo de la sidebar | `--color-card` |
| Borde divisorio (separa la sidebar del contenido, y separa la navegación del pie) | `--color-border` |
| Ítem inactivo | texto `--color-muted-foreground` |
| Ítem activo | fondo `rgba(0,100,124,0.08)`, texto/ícono `--color-primary`, borde derecho 4px `--color-primary` (ver arriba) |
| Ítem "Cerrar sesión" | texto/ícono `--color-error`; fondo `--color-error-bg` al pasar el mouse/tocar |
| Avatar de la tarjeta de perfil | fondo `--color-primary`, inicial `--color-primary-foreground` |

**Área táctil**: cada ítem (fila completa en escritorio/tablet, celda completa en la barra
inferior de celular) respeta el mínimo de 44×44px de la sección 4.1, incluyendo el
padding.

**Colapso por ruta** (rediseño visual de `005-atencion-paciente`, §6.15): en el panel de
Atención (`/citas/[id]`) la sidebar se colapsa sola a la versión de solo íconos (`64px`,
misma que tablet) independientemente del viewport, de `≥640px` en adelante — decide por
`pathname.startsWith("/citas/")` en `layout.tsx`, `shell.module.css`/`layout.tsx`
compensan el mismo ancho angosto en `.content`. Es el único lugar de la app con esta
excepción por ruta; en todas las demás pantallas manda la preferencia del usuario (ver
abajo).

**Colapso manual** (elegido por el usuario, en escritorio `≥1024px`): un botón con una
flecha (`<` colapsar / `>` expandir) en la propia Sidebar alterna entre expandida y la
misma versión de solo íconos de `64px`. El botón solo se muestra en `≥1024px` — en
tablet/celular la sidebar ya cambia de forma por breakpoint, togglearla ahí no agrega
nada — y se oculta por completo en `/citas/[id]`, donde el colapso ya está forzado por
ruta (togglearlo no cambiaría nada visible). La preferencia se guarda en `localStorage`
(clave `sidebar-colapsada`) y se restaura al cargar cualquier pantalla — primer precedente
de este patrón de persistencia en el proyecto. El estado combinado (forzado por ruta O
preferencia manual) se calcula una sola vez en `layout.tsx` y baja a `Sidebar.tsx` por
props, para que `.content` compense el mismo ancho sin duplicar el cálculo en dos
componentes.

**Animación del colapso** (revisión posterior, feedback directo de la odontóloga: el
cambio de ancho se sentía "rígido/instantáneo"): `.sidebar` (`width`, `padding`) y
`.content` (`margin-left`, `shell.module.css`) transicionan en paralelo,
`200ms ease-in-out` — sin esto, `.content` saltaría antes/después que la sidebar en vez de
acompañarla. Respeta `prefers-reduced-motion: reduce` (transición desactivada). Aplica
tanto al toggle manual como al colapso forzado por ruta (`/citas/[id]`) — al navegar ahí
sin recargar la página (SPA), el ancho también anima en vez de saltar.

**Sincronización con elementos `position:fixed`** (008-rediseno-visual-sistema, §6.20): el
booleano `colapsada` que calcula `ShellLayout` se expone también vía `SidebarContext`
(`src/components/ui/SidebarContext.tsx`, hook `useSidebarColapsada()`). Esto existe
específicamente para elementos con `position:fixed` (como `TopAppBar`, §6.20) — el
`margin-left` de `.content` es un desplazamiento de un contenedor normal en el flujo del
documento, así que no llega a un elemento fixed, que se posiciona relativo al viewport. Un
elemento fixed que necesita respetar el ancho de la sidebar debe leer este contexto y aplicar
su propio `margin-left` condicional (con la misma transición de 200ms) — **nunca**
recalcular el colapso por su cuenta (leer `localStorage` o `pathname` de nuevo), para no
duplicar esa lógica en dos lugares que puedan desincronizarse.

### 6.9 Avatar

Círculo con las iniciales (1-2 letras) de un nombre. Usado en el listado de pacientes
(§6.5) y en la tarjeta de perfil de la Sidebar (§6.8, ahí siempre en `--color-primary`).

**Tamaños**: `sm` 32px (listados densos), `default` 40px (listado de pacientes), `lg` 64px
(encabezado de la ficha de paciente, §6.12).

**Color de fondo — paleta reutilizada, no colores nuevos** (research.md #13): el color se
elige por una función determinística (hash de las iniciales, módulo 5) sobre estos 5
tokens, todos ya existentes y ya validados con contraste ≥4.5:1 sobre blanco — no hace
falta agregar ni justificar ningún color nuevo en la paleta:

| Token | Uso normal en el sistema |
|---|---|
| `--color-primary` | relleno de botones primarios (sigue el tema activo, §3.2.1) |
| `--color-primary-active` | estado `active` de botones primarios (sigue el tema activo) |
| `--color-teal-700` | texto/ícono de éxito |
| `--color-slate-500` | texto secundario/mutado |
| `--color-slate-700` | texto principal |

Se excluyen a propósito rojo y ámbar (error/advertencia) — un avatar de ese color se
leería como un estado de la ficha, no como una identidad visual neutra. Texto: siempre
`--color-primary-foreground` (blanco), independientemente de cuál de los 5 tonos le tocó.

**Corrección `007-tema-apariencia`**: los primeros dos tonos usaban los primitivos
`--color-cyan-700`/`--color-cyan-900` directo, no los tokens semánticos — con el tema
morado activo, esos dos tonos de avatar seguían viéndose azules mientras el resto de la app
ya era morada (bug reportado por el odontólogo). Se cambiaron a `--color-primary`/
`--color-primary-active`, que siguen el tema; los otros 3 tonos (`teal-700`, `slate-500`,
`slate-700`) no forman parte de la familia "primary", así que quedan fijos como antes.

### 6.10 Tabs

Control segmentado para alternar entre dos (o más) vistas de la misma pantalla sin
navegar — ej. "Activos" / "Archivados" en el listado de pacientes (`001-gestion-pacientes`,
reemplaza lo que antes era una ruta separada).

**Estado activo**: reutiliza el mismo tratamiento que ya usa el ítem activo de la Sidebar
(§6.8) — fondo `--color-primary-bg`, texto `--color-primary` — en vez de inventar un patrón
"activo" distinto para este componente.
**Estado inactivo**: texto `--color-muted-foreground`, sin fondo.
**Contenedor**: fondo `--color-muted`, borde `1px` `--color-slate-300`, sombra
`--shadow-sm` (más contraste que un fondo plano — el mockup del usuario lo pedía más
visible), radio `--radius-lg`, padding `--space-1`; cada pestaña con radio `--radius-md`,
padding `--space-2` `--space-4`, altura mínima 44px (§4.1). Cambiar de pestaña es solo
estado de UI — nunca dispara una navegación de página.

#### 6.10.1 Variante "subrayado" (ficha de paciente)

Segunda variante del mismo componente `Tabs` (prop `variante="subrayado"`, default sigue
siendo `"pill"` — el Panel de Atención, §6.15, no cambia), agregada para la ficha de
paciente (§6.12): en vez del fondo relleno de "pill", cada pestaña lleva un ícono (16-18px,
`TabOption.icono`) + etiqueta, y la pestaña activa se marca con una barra de color debajo
(`border-bottom: 2px solid var(--color-primary)`) y texto/ícono en `--color-primary` — sin
fondo. El contenedor es una fila simple con `border-bottom: 1px solid var(--color-border)`
que hace de línea base para todas las pestañas. Una pestaña puede marcarse
`deshabilitada` (ej. "Planes", pendiente de implementar): se renderiza pero no es
seleccionable (`disabled` nativo), mismo criterio que se usó para el placeholder de
Odontograma antes de existir (005-atencion-paciente). En `<640px` el contenedor scrollea
horizontalmente en vez de apilar o encoger las pestañas (`overflow-x: auto`, cada pestaña
con `flex-shrink: 0`) — mismo criterio que el diagrama del Odontograma (§6.16) para no
forzar overflow de la página completa. Sin tokens nuevos.

### 6.11 Formulario en secciones (alta de paciente)

Patrón para formularios largos dentro de una Card ancha (`max-width: 1100px`, ej. "Nuevo
paciente" — más ancha que el resto de las Cards del sistema porque aprovecha filas de 3
campos): se agrupan los campos en secciones con un título propio (ícono `20px` en
`--color-primary` + `heading` `--font-size-lg`/`semibold`), cada una con sus campos en una
grilla (`--space-4` de separación). "Datos personales" usa 3 columnas (2 por debajo de
`768px`, 1 por debajo de `640px`); "Información de contacto" usa 2 columnas (1 por debajo
de `640px`) — el número de columnas depende de cuántos campos comparten naturalmente una
fila, no es fijo para todo el formulario. Un campo puede ocupar el ancho completo de su
grilla cuando no tiene una pareja natural (ej. Nombre completo, Dirección).

**Campos de "Datos personales"**, en este orden dentro de la grilla de 3: Nombre completo
(fila completa) → Documento / Fecha de nacimiento / Género → Estado civil / Ocupación.
Género: `Masculino` / `Femenino` / `Otro` (sin una cuarta opción tipo "Prefiero no decir" —
se sacó a pedido del usuario). Estado civil: `Soltero/a` / `Casado/a` / `Divorciado/a` /
`Viudo/a` / `Unión libre`. Ambos opcionales, mismo Select que Género (§6.2).

**Placeholders**: todo campo de texto libre lleva un placeholder de ejemplo (`Ej. ...`) que
orienta el formato esperado sin necesidad de ayuda adicional — no reemplaza al `label`
(que siempre queda visible arriba del campo, nunca solo como placeholder).

**Documento de identidad** (`src/components/ui/DocumentoIdentidadInput.tsx`): campo
compuesto selector V-/E- + número, mismo alto/bordes/foco que Input (§6.2) pero con el
selector y el número compartiendo un solo borde exterior. El número se muestra con puntos
de miles mientras se escribe (solo visual, ver `documentoIdentidad.ts`) — lo que se guarda
es `prefijo + dígitos`, sin puntos ni guion (igual convención que los datos existentes).

**Historia clínica** (`003-historia-clinica-paciente`, sección propia después de
"Información de contacto"): checklist de 21 antecedentes personales patológicos, cada uno
un `Checkbox` (§6.2), en grilla de 3 columnas en escritorio, 2 en tablet, 1 en celular —
mismo criterio de colapso que las demás grillas de esta sección, no un layout fijo como el
formulario en papel de referencia. Última opción "Otros": al marcarse despliega un
`Textarea` (§6.2) para describir antecedentes no listados; al desmarcarse, el `Textarea` se
oculta y su contenido se descarta (no viaja al guardar). Debajo del checklist, 3 `Textarea`
de fila completa: Antecedentes heredofamiliares, Medicamentos actuales, Alergias. Ninguno
de los campos de esta sección es obligatorio.

**Un solo formulario para alta y edición** (`src/components/pacientes/PacienteFormulario.tsx`):
el Card + form completo de esta sección es un componente compartido — alta
(`pacientes/nuevo`) y edición (`pacientes/[id]`, dentro de la misma ficha) se ven
idénticos a propósito, ya que son la misma pantalla con o sin datos precargados. Solo
cambian los valores iniciales, el texto del botón de envío (“Crear paciente” / “Guardar
cambios”) y qué hace el `onEnviar`. Evitar mantener dos formularios visualmente distintos
para la misma entidad.

### 6.12 Ficha de paciente (modo lectura)

Rediseño visual posterior: antes era una sola `Card` larga con todo apilado (formulario,
secciones y acciones en un único footer); ahora es un encabezado tipo tarjeta + pestañas
(variante "subrayado", §6.10.1) — mismo criterio de "no tan plano" que ya se aplicó al
Panel de Atención (§6.15: `--shadow-md`, no `--shadow-sm`, y `Avatar` en el encabezado).

**Encabezado** (tarjeta `--color-card` + borde + `--shadow-md`, `padding` `--space-5`
`--space-6`): `Avatar` tamaño `lg` (64px, §6.9) + nombre (`heading-lg`) + `Badge` de estado,
email debajo en `muted-foreground` si el paciente tiene uno cargado (nada si no). A la
derecha: "Nueva cita" (oculto si está archivado) y Archivar/Reactivar según corresponda. Sin
botón "Ver odontograma" — se retiró (revisión posterior) porque quedaba redundante con el
tab Odontograma de abajo, que ya cubre el caso de un paciente archivado (soloLectura forzado
ahí). Estos botones son los mismos que antes vivían en
el footer de la Card — se relocalizan, no cambian de comportamiento.

**Pestañas**: Información / Odontograma / Planes (deshabilitada, "Próximamente") / Citas /
Archivos. Información es la
pestaña por defecto.

- **Información**: reutiliza el mismo patrón de secciones con ícono del formulario
  (§6.11), pero cada sección ahora es su propia tarjeta (`--shadow-md`) en vez de una única
  Card envolvente — "Datos personales" (grilla de 3: Documento/Fecha de
  nacimiento/**Edad** calculada al vuelo → Género/Estado civil/Ocupación si están
  cargados, con el botón "Editar" arriba a la derecha de esta tarjeta específica, ícono de
  lápiz + texto), "Información de contacto" (grilla de 2, con el mismo criterio de texto
  vacío explícito que ya usaba esta pantalla — "Sin información de contacto registrada" en
  vez de una sección en blanco), "Historia clínica" (`003-historia-clinica-paciente`, sin
  cambios de contenido) y una tarjeta nueva "Datos del sistema" (Fecha de registro / Última
  actualización, usando `paciente.createdAt`/`updatedAt` — existían en el dominio pero no
  se mostraban). Cada campo sigue siendo ícono + label (`caption`) + valor (`body`), sin
  cambios respecto a la versión anterior.
- **Odontograma**: embebe `OdontogramaTab` (§6.16) en modo lectura por defecto, con un
  botón "Editar"/"Listo" propio de esta pestaña (oculto si el paciente está archivado) que
  alterna al modo edición — `OdontogramaTab` ganó una prop opcional `soloLectura` para esto:
  si se pasa, fuerza el modo; si no, cae al comportamiento original (solo lectura únicamente
  si está archivado), que es el que sigue usando la ruta standalone y el Panel de Atención.
- **Citas**: nuevo componente (`CitasTab`) — tabla (Fecha y hora / Tratamiento / Estado +
  columna de acción) de todas las citas finalizadas del paciente, con "+ Nueva cita" en su
  propio encabezado. Sin columna "Doctor": el sistema es de un solo usuario. El detalle de
  una fila abre en un `Drawer` con acento (§6.17) reutilizando `CitaDetalleSoloLectura` tal
  cual — antes un `Modal` centrado (rediseño posterior, boceto aprobado: el detalle de un
  registro puntual se lee mejor como panel lateral que como diálogo centrado). Distinto del
  `HistorialDrawer` embebido en el Panel de Atención (§6.15), que expande el detalle en el
  lugar en vez de abrir un panel propio, porque ahí ya vive dentro de un Drawer angosto.
  Dentro del detalle, botón "Imprimir" que llama a `window.print()` — imprime el talonario/
  receta de esa cita (`RecetaImprimible`, §6.24) con el membrete real de la odontóloga, no
  el propio `CitaDetalleSoloLectura` que se ve en pantalla.
- **Archivos**: nuevo componente (`ArchivosTab`) — tabla (Nombre/Tipo/Tamaño/Fecha +
  columna de descarga/borrar) más un `FileInput` (§6.14) para subir. A diferencia del
  resto de la ficha, es **online-only sin espejo en Dexie** (entidad nueva
  `ArchivoPaciente`, mismo criterio que `ArchivoEstudio` de 005: contenido binario solo en
  PostgreSQL) — la pestaña hace `fetch` directo al servidor en vez de `useLiveQuery`, y
  muestra un aviso si no hay conexión en vez de la tabla. Es el único punto de entrada
  para subir archivos del paciente: la subida que antes vivía colgada de un Estudio dentro
  de una Cita finalizada (§6.14) se retiró de ese lugar para no duplicar el mismo
  resultado en dos pantallas.

**Notas al pie informativas** (ej. "Atención rápida", "Datos protegidos" debajo del
formulario de alta/edición): sin cambios — tarjetas chicas de ícono + texto (`caption`),
mismos tokens de fondo que Alert (§6.7) más `--color-muted`, sin `role="alert"`.

### 6.13 Accordion

Componente nuevo (`005-atencion-paciente`, `src/components/ui/Accordion.tsx`): lista de
secciones colapsables **independientes** entre sí (no exclusivas — abrir una no cierra las
demás), a diferencia de Tabs (§6.10), que sí es exclusivo. Se usó en vez de un segundo
patrón de "tabs" porque el panel de Atención necesita que Antecedentes e Historial de citas
anteriores puedan consultarse en simultáneo sin perder el estado del otro.

| Elemento | Valor |
|---|---|
| Encabezado de sección | fila clickeable, `min-height: 44px` (§4.1), `body-sm` + flecha (`--color-muted-foreground`, rota 180° al abrir) |
| Borde entre secciones | `1px` `--color-border` |
| Contenedor | borde `1px` `--color-border`, radio `--radius-lg`, fondo `--color-card` — mismos tokens que Card (§6.3) |
| Hover del encabezado | fondo `--color-slate-50` |
| Foco | `box-shadow: inset 0 0 0 2px var(--color-ring)` |

Sin colores, tipografía ni espaciado nuevos — reutiliza los tokens ya existentes.

### 6.14 FileInput

Componente nuevo (`005-atencion-paciente`, `src/components/ui/FileInput.tsx`): selector de
archivo nativo (`<input type="file">`) restringido a imagen o PDF (`accept="image/*,application/pdf"`).
Mismo lenguaje visual que Input (§6.2): mismo alto mínimo (44px), borde, foco, y mensaje de
error en `caption`/`--color-error` con `role="alert"` — el tipo de archivo se valida también
en el cliente antes de intentar subir (mensaje "Solo se aceptan imágenes o archivos PDF."),
pero el servidor vuelve a validarlo igual (defensa en profundidad, nunca solo del lado
cliente). Sin tokens nuevos. Uso actual: pestaña Archivos de la ficha (§6.12) — antes
también se usaba para adjuntar el resultado de un estudio complementario directamente
desde una Cita finalizada (FR-017 a FR-019), UI que se retiró al unificar la subida en un
solo punto de entrada (rediseño visual posterior); el endpoint y los archivos ya subidos
por esa vía siguen existiendo y viéndose en modo lectura, solo se quitó el input para
agregar uno nuevo ahí.

### 6.15 Pantalla: Panel de Atención (`005-atencion-paciente`)

Pantalla nueva (`/citas/[id]`, `src/components/citas/PanelAtencion.tsx`) — se abre desde la
ficha del paciente (botón "Nueva cita" en el `CardFooter` de §6.12). Rediseño visual
posterior (segunda ronda de feedback, bocetos de referencia de la odontóloga): más aire y
más contraste visual, sin la columna lateral fija de 320px que antes le quitaba ancho a
todas las pestañas — en particular al Odontograma (§6.16), que antes necesitaba scroll
horizontal para mostrar una arcada completa embebida en esta pantalla.

- **Sidebar de navegación** (§6.8): se colapsa sola a la versión angosta de solo íconos
  (64px, la misma que ya existe para tablet) en esta pantalla — `Sidebar.tsx` decide por
  `pathname.startsWith("/citas/")`, `shell.module.css`/`layout.tsx` compensan el mismo
  ancho angosto en `.content`. En el resto de la app (Inicio, Pacientes, Insumos,
  Configuración) sigue expandida como siempre — es un cambio acotado a esta ruta, no un
  cambio de comportamiento general de la sidebar.
- **Encabezado**: ahora es una tarjeta propia (`--color-card`, borde, **`--shadow-md`** —
  no `--shadow-sm`, para que se note por encima del fondo de página, mismo token ya
  existente en §2.4, sin inventar uno nuevo) con `Avatar` `lg` (§6.9) + nombre del paciente
  (`heading-lg`) + subtítulo "{edad} años · {documento}" a la izquierda, botón "Finalizar
  atención" (con confirmación en `Modal`) a la derecha. Ya no hay `Badge` de estado "En
  curso"/"Finalizada" ni ninguna alerta destacada junto al nombre — Diagnóstico/Receta/
  Estudios son un borrador que no existe como registro hasta presionar "Finalizar atención"
  (research.md #6 de `006-odontograma` documenta esta misma revisión para Antecedentes/
  Odontograma, que sí se guardan de inmediato).
- **Tabs** (§6.10, ancho completo): Diagnóstico, Receta, Estudios, Odontograma
  (`006-odontograma`, §6.16). El contenido de cada tab vive en una `Card`-like
  (`--color-card`, borde, **`--shadow-md`**, padding `--space-8`) debajo del control de
  Tabs.
- **Antecedentes e Historial de citas anteriores**: agrupados en un `Drawer` (§6.17) que se
  abre desde una pestaña fija al borde derecho de la pantalla (ícono de hamburguesa +
  etiqueta vertical "Historial", `position: fixed; right: 0`, siempre alcanzable sin
  importar la pestaña activa ni el scroll) — **no** un botón en el encabezado ni una pestaña
  más del Tabs central, a pedido explícito de la odontóloga. Adentro, un `Accordion` (§6.13)
  con dos secciones, mismo patrón que la versión original de esta pantalla: "Antecedentes"
  (reutiliza el formulario de historia clínica de §6.11, abierta por defecto) e "Historial
  de citas anteriores" (línea de tiempo — un ítem estático "Hoy — en progreso" arriba, y
  cada cita finalizada como una entrada expandible en el lugar con `CitaDetalleSoloLectura`
  completo, en vez de un `Modal` anidado por cita — termina con un enlace "Ver expediente
  completo" a la ficha del paciente).
- **Receta / Estudios**: listados como tabla (`<table>`, encabezado en `--color-muted` +
  `text-xs` mayúscula) en vez de tarjetas apiladas — columnas Medicamento/Dosis/Frecuencia/
  Duración (Receta) y Tipo de estudio/Indicación-Motivo (Estudios). El formulario de alta
  queda oculto detrás de un botón de borde punteado ("+ Agregar…", mismo tratamiento en
  ambas pestañas) en vez de estar siempre visible debajo de la lista.

**Responsive** (§4.0): el Drawer combinado (§6.17) resuelve mobile/tablet/desktop con un
solo patrón (a diferencia del Accordion+Modal de tres casos que tenía antes) — pantalla
completa en `<640px`, panel de `420px` desde `≥640px`. Las tabs y el contenido de cada
pestaña son fluidos, sin quiebre de layout propio adicional en esta pantalla.

Tokens: `.pagina { max-width: 1600px }` (antes 1200px) — los formularios de texto
(Diagnóstico, `max-width: 800px` interno) ya se autolimitan, así que ensanchar la página no
los afecta, solo le da más aire a Receta/Estudios/Odontograma en monitores anchos. El
encabezado y el contenido de cada tab pasan de `--shadow-sm` a `--shadow-md` — ambos ya
existían en §2.4, no son tokens nuevos, solo un uso más consistente con "moderno, no
excesivamente plano" en el feedback de la odontóloga.

### 6.16 Pantalla: Odontograma (`006-odontograma`)

Pantalla con dos puntos de entrada: el tab "Odontograma" del Panel de Atención (§6.15) y el
tab "Odontograma" de la ficha (§6.12, con su propio botón ver/editar) — a diferencia de
Diagnóstico/Receta/Estudios, el odontograma es un dato del paciente, no de una Cita (igual
que Antecedentes), así que sigue siendo consultable incluso para un paciente archivado, que
no tiene el botón "Nueva cita". También existe la ruta standalone
`/pacientes/[id]/odontograma` (sin cambios de código), pero ya no está enlazada desde
ningún lado — el botón "Ver odontograma" que la exponía en la ficha se retiró por
redundante con el tab (revisión posterior); se deja la ruta sin borrar por si hace falta un
link directo más adelante.

- **Vista** (revisión posterior): pestañas "Actual"/"Historial" (`Tabs`, §6.10,
  variante "pill") por encima de todo lo demás — la dentición seleccionada (Adulto/Niño) se
  comparte entre ambas vistas, no se resetea al cambiar.
- **Encabezado** (vista "Actual"): pestañas "Adulto"/"Niño" (mismo patrón
  visual que Tabs, §6.10, pero implementadas como `role="tablist"` propio por su ubicación
  junto a Deshacer/Rehacer). A la derecha, botones "Deshacer"/"Rehacer" (ícono de flecha
  curva + texto, `variant="outline"`, ocultos en solo lectura) — pila en memoria de
  snapshots `{hallazgos, notas}` por dentición (no persistida entre recargas, mismo
  criterio que la mayoría de los editores), acotada a la sesión actual. Deshacer/rehacer
  **no** son un bypass silencioso de la auditoría (Principio III): reutilizan el mismo
  `CambioOdontograma` que una edición manual — comparan el snapshot destino contra el
  estado actual y registran un cambio por cada hallazgo/nota que efectivamente difiere
  (`restaurarSnapshotOdontograma`), así el Historial (más abajo) sigue siendo correcto
  después de un deshacer/rehacer.
- **Panel de herramientas** (izquierda, `260px`): `Accordion` (§6.13) con las 8 categorías
  del catálogo de 44 condiciones, cada una listando sus condiciones como filas de solo
  lectura (símbolo + nombre) — es de referencia, el marcado real ocurre en el diagrama. Un
  botón "Ver leyenda" arriba abre el mismo catálogo completo en un `Modal` (§6.4). El botón
  queda fijo; todo lo demás (contexto del diente/superficie seleccionado, notas, lista de
  hallazgos, el acordeón de categorías) vive en un contenedor propio con scroll vertical
  independiente — `max-height: min(600px, 70vh)` + `overflow-y:auto`, techo fijo e
  independiente del diagrama (revisión posterior a una primera versión que probó
  `align-items:stretch` en `.cuerpo` para igualar panel y diagrama: sin ningún ancestro con
  altura fija en este layout, stretch iguala ambos hermanos a la altura del *más alto*, y
  con varias categorías abiertas el panel casi siempre es más alto que las 2 filas de
  dientes — el resultado era que el panel nunca llegaba a desbordar y en cambio inflaba el
  diagrama con espacio en blanco debajo de los dientes, sin ningún scroll propio real). En
  mobile (`<640px`, donde panel y diagrama se apilan en columna) este techo se desactiva y
  vuelve al scroll de página normal — un scroll anidado ahí sería confuso al tacto.
- **Diagrama de boca** (centro, scroll horizontal propio en `<640px` — no empuja la página
  entera): arcada superior e inferior, cada diente con su número (`caption`,
  `muted-foreground`), un botón "corona" (diente completo) y una cruz de 5 botones-celda
  (superficies mesial/distal/vestibular/palatino-lingual/oclusal-incisal), todos con
  `aria-label` descriptivo. Los hallazgos vigentes se superponen como símbolos.
  Dimensiones escaladas 1.25x sobre el diseño original (revisión posterior: la cruz era
  demasiado chica para tocar con el dedo en celular) — `.diente` 52px de ancho
  (`flex-shrink:0` — revisión posterior: sin esto, un contenedor angosto comprimía cada
  diente por debajo de 52px, pero el overlay de líneas TRAMO seguía asumiendo el ancho sin
  comprimir, así que terminaba más ancho que la fila real y el scroll horizontal exponía
  ese sobrante como espacio en blanco en vez de dientes), corona 43×38px, cruz 38×38px,
  raíz 18×18px; `LineaMultiDiente.tsx` (línea de condiciones TRAMO) y el overlay SVG de
  `DiagramaBoca.tsx` escalan las mismas proporciones. En pantallas angostas (~1280px o
  menos, con el panel de herramientas al lado) puede necesitar scroll horizontal propio —
  esperado, misma degradación que en mobile — pero con `flex-shrink:0` ese scroll siempre
  revela dientes reales, nunca espacio vacío.
- **Símbolos**: dos tipos, sin librería de gráficos externa (research.md #8 de
  `006-odontograma`). *Badge*: círculo de texto (8px, blanco sobre color) para la mayoría del
  catálogo. *Gráfico*: SVG a medida (14×14) para el resto — X, flechas, zigzag, líneas
  dobles/sólidas/punteadas, círculos. Convención de color transversal: **rojo**
  (`--color-error`) = pendiente/planificado, **azul** (`--color-odontograma-azul`, §3.2.2) =
  realizado/presente — dos colores fijos, independientes de cualquier tema de apariencia que
  el usuario elija (`007-tema-apariencia`; antes de esa feature usaba `--color-primary`
  directamente, que en ese momento era siempre azul — ver §3.2.2 para el detalle de por qué
  se separó).
- **Selección de condición**: clic en un diente/superficie sin hallazgos abre
  `ModalSeleccionCondicion` (`Modal` + `Select` con `optgroup` por categoría, más `Select`/
  `Textarea` condicionales para variante/diente adicional/nota). Con hallazgos existentes,
  abre en cambio `ModalHallazgosExistentes` (lista con botones "Marcar realizado/pendiente" y
  "Eliminar", más "+ Agregar otro hallazgo").
- **Historial** (vista, ya no un `Modal` — `HistorialOdontogramaTab`, reemplaza al
  retirado `HistorialOdontogramaPanel`): a la izquierda, una línea de tiempo de solo
  lectura y clickeable (más reciente primero, mensaje explícito si todavía no hay
  checkpoints, mismo criterio que "Sin historia clínica registrada", §6.12). A la derecha,
  el mismo `DiagramaBoca` de la vista "Actual" pero de solo lectura (`onClickDiente`/
  `onClickSuperficie` no-op) y con los hallazgos reconstruidos para el checkpoint
  seleccionado (el más reciente por defecto), no el estado vigente del odontograma.
  **Granularidad por sesión, no por cambio** (revisión posterior a una primera versión que
  listaba cada AGREGADO/EDITADO/ELIMINADO individual — feedback directo de la odontóloga:
  agregar un hallazgo no debe aparecer de inmediato en el historial, eso llena la base de
  datos de entradas ruidosas; solo quiere un "cómo se veía antes" cuando termina de editar).
  El log de auditoría append-only (`CambioOdontograma`, con su columna `snapshot` — el
  `HallazgoDental`/`NotaDental` completo en el momento de ese cambio) sigue registrando
  cada cambio granular sin excepción (Principio III, auditabilidad), pero la pestaña
  Historial solo lista un tipo especial de entrada, `CHECKPOINT` (`crearCheckpointOdontograma`
  en `CambioOdontograma.ts`) — sin diente/hallazgo/nota propios (`hallazgoId`/`notaId`/
  `snapshot` en null), es un marcador de "acá se cerró una sesión de edición", no un cambio
  puntual. Cada checkpoint reconstruye (`reconstruirHallazgosAlMomento`,
  `reconstruirNotasAlMomento`) el momento del checkpoint cronológicamente anterior — el
  estado tal cual quedó al cerrar la sesión previa, sin necesitar guardar ninguna "foto"
  extra por checkpoint.
  - **Cuándo se crea un checkpoint** (`registrarCheckpointsOdontogramaPaciente`): al cerrar
    una sesión de edición — botón "Listo" en la ficha del paciente (§6.12) o "Finalizar
    atención" en el Panel de Atención (§6.15) — revisando ambas denticiones (quien dispara
    esto no sabe cuál se editó). Si no hubo ningún cambio granular desde el último
    checkpoint (o nunca, si es la primera sesión), no crea nada — evita checkpoints vacíos
    por entrar y salir de "Editar" sin tocar nada. La descripción de cada entrada es
    genérica y cuenta los cambios que archiva ("3 cambios guardados"), no el detalle de
    cada uno — ese detalle sigue existiendo en el log granular subyacente, solo no se
    expone entrada por entrada.
- **Plan de tratamiento**: tabla (fecha/diente/tratamiento) debajo del diagrama, con
  `Input`/`Button` para alta y edición inline — reemplaza el campo de texto libre que existía
  en la pestaña Diagnóstico de `005-atencion-paciente` (§6.15 ya no lo incluye).
- **Solo lectura** (paciente archivado, FR-019): el formulario del plan de tratamiento no se
  muestra, `ModalHallazgosExistentes` no ofrece acciones, y un diente/superficie sin
  hallazgos no abre ningún selector — mismo criterio de solo-lectura que el resto de la ficha
  (§6.12).

Componente compartido modificado: `CardFooter` (§6.3) gana `flex-wrap: wrap` — con un cuarto
botón ("Ver odontograma") en la ficha de paciente, sin wrap el footer se salía del viewport en
`<640px` en vez de apilarse (bug encontrado y corregido durante esta feature).

Sin colores, tipografía ni espaciado nuevos — los símbolos rojo/azul reutilizan
`--color-error`/`--color-odontograma-azul` ya existentes (§3.2.2).

### 6.17 Drawer / Panel deslizable

Componente nuevo (rediseño visual de `005-atencion-paciente`, `src/components/ui/Drawer.tsx`)
— mismo manejo de overlay/Escape/foco que `Modal` (§6.4), pero anclado al borde derecho
(`justify-content: flex-end` en el overlay) en vez de centrado, con `width: 100%; max-width:
420px; height: 100%`. Se usa para contenido de consulta rápida que no debe interrumpir el
flujo principal como un diálogo centrado sí lo hace — Antecedentes + Historial de citas
anteriores agrupados (§6.15), y el detalle de una cita en `CitasTab`. Encabezado propio con
botón "Cerrar" (ícono X, 32×32px, mismo tratamiento de foco/hover que el resto de los
botones-ícono del sistema) además del cierre por Escape/clic en el overlay que ya provee
`Modal`. Responsive: pantalla completa por debajo de 640px, igual criterio que `Modal`
(§4.0). Sin tokens nuevos — reutiliza `--shadow-lg`, `--color-card`, z-index 1200.

Dos props opcionales agregadas para el detalle de una cita (`CitasTab`, boceto aprobado),
ambas sin efecto si se omiten — los usos existentes (Antecedentes/Historial) no cambian:

- `subtitulo?: ReactNode`: línea de contexto debajo del título dentro de la misma cabecera
  (ej. fecha/hora · categoría) — solo la cabecera crece para acomodarla, `.content` no se ve
  afectado.
- `acento?: boolean`: tiñe la cabecera con `--color-primary-bg` (en vez de blanco plano) y
  el botón "Cerrar" toma `--color-primary-accent` — pensado para que la cabecera se lea como
  una franja de contexto del registro que se está mostrando, no como una fila de acciones
  más. Sin tokens nuevos — reutiliza `--color-primary-bg`/`--color-primary-accent` ya
  definidos en §3.2.1.

### 6.18 VolverLink

Componente nuevo (`src/components/ui/VolverLink.tsx`): link de "volver a la pantalla
anterior" — flecha + texto (`texto` configurable, default "Volver"), color
`--color-muted-foreground`. Reemplaza tres implementaciones ad-hoc casi idénticas que
existían en `pacientes/[id]/page.tsx`, `pacientes/[id]/odontograma/page.tsx` y
`PanelAtencion.tsx` (cada una con su propia clase `.volver` en su CSS module). La flecha se
desplaza sutilmente (`translateX`) al pasar el mouse o al enfocarla con teclado — nunca solo
al hover, mismo criterio de accesibilidad que el resto del sistema (§4.1). Sin tokens
nuevos.

Su disparador es una pestaña fija al borde derecho de la pantalla (`position: fixed; right:
0; top: 50%`, ícono de hamburguesa + etiqueta en `writing-mode: vertical-rl`), no un botón
en el encabezado — a pedido explícito de la odontóloga, para que quede alcanzable sin
importar la pestaña activa ni el scroll de la página.

### 6.19 Selector de tema (Apariencia)

`007-tema-apariencia` — sección "Apariencia" en Configuración
(`src/app/(shell)/configuracion/page.tsx`), dentro de una `Card` (§6.3) entre "Tus datos" y
"Cambiar contraseña". Dos botones tipo swatch (círculo de 40px + etiqueta "Azul"/"Morado"),
`aria-pressed` para indicar cuál está activo, tamaño de toque ≥44px incluyendo el padding
(§4.1). Al hacer clic, llaman `setTema` del hook `useTema` (`src/hooks/useTema.ts`) — se
aplica al instante, sin botón "Guardar".

**Excepción documentada al §2 ("nadie referencia primitivos directamente")**: el círculo de
cada swatch usa `--color-cyan-700`/`--color-purple-700` (primitivos) en vez de
`--color-primary`, a propósito — su función es mostrar cómo se ve *cada* opción, incluida la
que no está activa, así que no puede depender del token semántico (que solo refleja el tema
ya elegido). Es el único lugar del sistema con esta excepción; no establece precedente para
otros componentes. El anillo de "seleccionado" alrededor del swatch activo sí usa el token
semántico `--color-ring`, porque ahí el comportamiento reactivo por tema es correcto (resalta
en el mismo tono que ya está aplicado).

### 6.20 TopAppBar (rediseño "mockup DentalPro")

Componente nuevo (`src/components/ui/TopAppBar.tsx`), introducido en
008-rediseno-visual-sistema junto con el resto del estilo visual descrito en esta sección.
Barra fija en la parte superior del contenido (no de toda la ventana — arranca después de la
Sidebar, §6.8), usada por primera vez en el listado de Pacientes.

**Estructura**: buscador a la izquierda (ícono + `<input>`, sin `Input` de §6.2 porque vive
dentro de un contenedor con estilo propio de vidrio esmerilado, no un formulario), y a la
derecha un único ícono de configuración + un botón de acción primaria opcional (`Button`
variante `primary`, §6.1, con label configurable — "+Nuevo paciente" en Pacientes).

**Deliberadamente no incluye** ícono de notificaciones: se agregó en un primer intento y se
retiró a pedido explícito del odontólogo — no hay ninguna fuente de notificaciones en el
sistema todavía, así que el ícono no tenía ninguna función real.

| Elemento | Valor |
|---|---|
| Alto | 64px |
| Fondo | `rgba(255,255,255,0.8)` + `backdrop-filter: blur(12px)` (glassmorphism) |
| Borde inferior | `rgba(0,0,0,0.08)` |
| Sombra | `--shadow-sm` |
| Buscador — contenedor | fondo blanco sólido, borde `rgba(0,0,0,0.12)`, `--radius-lg`, foco con anillo `rgba(0,100,124,0.15)` |
| Ícono de configuración | botón circular 40×40px, `--radius-lg`, `--color-muted-foreground`, hover con fondo `rgba(0,0,0,0.06)` y color `--color-primary` |
| `z-index` | 20 (por debajo de `Modal`/`Drawer`, por encima del contenido normal) |

**Sincronización con la Sidebar** (ver §6.8, "Sincronización con elementos `position:fixed`"):
`TopAppBar` es `position:fixed`, por lo que el `margin-left` de `.content` no lo alcanza —
usa `useSidebarColapsada()` (`SidebarContext`) para alternar entre `margin-left: 256px`
(sidebar expandida) y `64px` (colapsada), con la misma transición de 200ms que el resto del
layout. En el breakpoint de tablet (`<1024px`) el offset se fuerza a `64px` sin importar
`.colapsada` (la Sidebar ya se fuerza angosta ahí, §6.8); en celular (`<640px`) se fuerza a
`0` (la Sidebar pasa a barra inferior, no ocupa ancho a la izquierda).

**Bug corregido — subrayado heredado del `<a>`**: el botón de acción primaria está envuelto
en un `<Link>` de Next.js. El `<a>` que renderiza tiene subrayado/color de "enlace" por
defecto del navegador; esa línea se dibuja a través de los elementos descendientes salvo que
el propio `<a>` (o un hijo directo) resetee `text-decoration` explícitamente — resetearlo
solo en el `<button>` interno no alcanzaba. Se agregó una clase `.linkReset`
(`text-decoration: none; color: inherit`) aplicada directamente sobre el `<Link>`.

### 6.21 Tarjeta de métrica (bento)

Patrón nuevo (008-rediseno-visual-sistema), usado en las 3 tarjetas de resumen sobre el
listado de Pacientes (Total Pacientes / Citas Hoy / Nuevos del Mes). No es un componente
`.tsx` reutilizable todavía (un solo consumidor) — vive como CSS local de la página
(`pacientes.module.css`); si una segunda pantalla necesita el mismo patrón, se extrae a un
componente compartido en `src/components/ui/` recién ahí (Principio V, YAGNI — no se
anticipa un segundo consumidor sin uno real).

| Elemento | Valor |
|---|---|
| Layout | `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`, `gap: --space-6` |
| Tarjeta | fondo blanco, `--radius-lg`, `--shadow-sm`, padding `--space-6`, borde `rgba(0,0,0,0.08)` |
| Hover | `translateY(-2px)` + sombra más marcada — misma idea de "elevar" que `Card` (§6.3) no tiene hoy |
| Título | `caption` mayúsculas, `letter-spacing: 0.02em`, `--color-muted-foreground` |
| Valor | `--font-size-4xl` (32px), `--font-weight-bold`, `--color-primary` |
| Ícono | círculo 48px con fondo tintado (`--color-primary` al 10% de opacidad) |

### 6.22 Switch-tabs (variante `Tabs`)

No es un componente nuevo — es la variante `"switch"` de `Tabs` (§6.10,
`src/components/ui/Tabs.tsx`/`.module.css`), agregada en 008-rediseno-visual-sistema. La
primera versión de este rediseño creó un control segmentado aparte con su propia marcación
en `pacientes.module.css`, casi idéntico a `Tabs` — se corrigió como violación del Principio
VI ("no crear componentes casi-duplicados que difieren solo en estilo") extendiendo `Tabs`
con una tercera variante en vez de mantener dos implementaciones del mismo concepto.

**Cuándo usar cada variante de `Tabs`**: `"switch"` para alternar entre 2 (o pocas) vistas de
una misma lista, con la pastilla activa bien diferenciada (Activos/Archivados en Pacientes);
`"pill"` (default) sigue siendo la variante de las pantallas todavía no migradas a este
estilo (Panel de Atención); `"subrayado"` para navegación entre secciones de una ficha
(§6.10.1). No usar `"switch"` fuera de pantallas ya migradas al estilo de esta sección — hacerlo
mezclaría el estilo nuevo y el anterior dentro de la misma pantalla.

| Elemento | Valor |
|---|---|
| Contenedor | fondo `rgba(0,0,0,0.05)`, borde `rgba(0,0,0,0.08)`, `--radius-lg`, padding `--space-1` |
| Pestaña inactiva | `--color-muted-foreground`, hover en `--color-primary` |
| Pestaña activa | fondo blanco sólido, `--color-primary`, `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`, `--font-weight-bold` |

### 6.23 Pantallas migradas al estilo "mockup DentalPro"

008-rediseno-visual-sistema introdujo un nuevo tratamiento visual (paleta más oscura/saturada
tipo Material 3, tipografía Inter, sombras "soft-saas", §§2.1/2.3/2.4) y 3 patrones de
componente nuevos (§§6.20–6.22). A la fecha de esta versión, **no todas las pantallas del
sistema lo usan todavía** — los tokens primitivos y semánticos (color, tipografía, radios,
sombras) sí cambiaron globalmente porque viven en `globals.css`, pero los patrones de
layout/componente nuevos son opt-in por pantalla:

| Pantalla | Estado |
|---|---|
| Pacientes (listado) | ✅ Migrada — `TopAppBar` (§6.20), tarjetas de métrica (§6.21), switch-tabs (§6.22), tabla moderna (§6.5) |
| Inicio | ⏳ Pendiente — sigue sin `TopAppBar`, tabla/tarjetas con el patrón anterior |
| Insumos | ⏳ Pendiente |
| Ficha de paciente | ⏳ Pendiente — sigue con `Tabs` variante `"subrayado"` sin cambios, sin `TopAppBar` |
| Odontograma | ⏳ Pendiente |
| Panel de Atención (Citas) | ⏳ Pendiente — sigue con `Tabs` variante `"pill"` (default) sin cambios |
| Configuración | ⏳ Pendiente |

Cada pantalla pendiente se migra en una spec futura propia, agregando `TopAppBar`
(§6.20) y adoptando los patrones §6.21/§6.22 donde apliquen — no se migran todas juntas para
mantener cada ronda de trabajo acotada y verificable (Principio V).

### 6.24 Impresión de una sola hoja (`#print-root`)

Patrón nuevo (primer uso: "Imprimir" en el detalle de una cita, `CitasTab` →
`RecetaImprimible`) para imprimir un documento suelto (una hoja, un talonario) sin que se
cuele el resto de la app alrededor — un problema real de cualquier SPA de una sola página:
`window.print()` imprime el DOM tal cual está, y ocultar "todo menos esto" con
`@media print` a mano es frágil si no hay un contenedor fijo que lo garantice.

**Infraestructura** (`src/app/layout.tsx`, `globals.css`, ambos ya existían, no hace falta
tocarlos de nuevo para un futuro documento imprimible):

- `<body>` tiene dos hijos directos: `#app-shell` (toda la app real) y `#print-root` (vacío
  la mayor parte del tiempo).
- En pantalla, `#print-root` es `display: none`.
- En `@media print`, se invierte: `#app-shell` pasa a `display: none` y `#print-root` a
  `display: block` — así lo único que llega a imprimirse es lo que haya dentro de
  `#print-root`, sin importar en qué pantalla/tab estaba el usuario.

**Por componente** (ej. `RecetaImprimible.tsx`): se monta vía `createPortal` directo a
`document.getElementById("print-root")` — nunca en el lugar del árbol de React donde vive
el botón "Imprimir", porque de ahí no podría escapar del resto de la ficha alrededor.
Chequeo de montaje (`useState` + `useEffect`) antes de acceder a `document`, mismo criterio
que cualquier acceso a APIs de navegador en un componente que también podría renderizarse
en el servidor. El propio documento imprimible define su tamaño de papel con `@page` (ej.
`size: 5.5in 8.5in` para media carta) — cada documento nuevo declara el suyo, no hay un
tamaño de página único para todo el sistema.

**Excepción documentada al design system de la app**: si el documento imprimible replica
papelería real de la odontóloga (ej. su talonario de recetas, con su propio membrete y
color de marca personal), no reutiliza los tokens `--color-primary`/`--color-cyan-*` de la
interfaz — define su propia paleta puntual con variables CSS locales al componente,
documentada en un comentario ahí mismo. Es papelería de marca personal, no la UI del
sistema (ver 1.28.0 en el Historial).

---

## 7. Gobierno de este documento

- Cambios a este documento siguen el mismo procedimiento de amendment que la constitución
  (ver `.specify/memory/constitution.md`, sección Governance): se propone el cambio, se
  justifica, se actualiza la versión de este archivo.
- Agregar un componente, variante, color o tamaño nuevo requiere editar este archivo
  primero. Un componente o valor que aparece en el código pero no aquí es una violación del
  Principio VI y debe corregirse (agregarlo aquí si está justificado, o eliminarlo del
  código si no lo está).
- Fuera de alcance de esta versión, a agregar solo cuando una feature concreta lo necesite:
  modo oscuro, sistema de animación, componentes de calendario. El tema configurable por el
  usuario (azul/morado) dejó de estar fuera de alcance en `007-tema-apariencia` (§3.2.1).

## Historial

- **1.30.0** (2026-08-06): el tema alternativo "Morado" (§3.2.1, §6.19) pasa a usar el
  morado real de marca de la odontóloga (`#905CA2`, el mismo del talonario imprimible,
  §6.24) en vez de un morado genérico sin relación con su papelería — primitivos §2.1
  actualizados (`--color-purple-50/600/700/800/900`), derivados en HSL a partir de `700 =
  #905CA2` con los mismos deltas de L/S que ya tenía la rampa anterior entre sus 4 pasos,
  para mantener la misma progresión tonal. Contraste verificado contra blanco (§4): 700
  (botones) 4.95:1 — pasa AA texto normal (4.5:1) justo por encima del mínimo; 800/900
  (hover/active) 6.49:1/8.34:1, sin problema; 600 (acento/anillo de foco) 3.98:1, mismo
  criterio de uso que `--color-cyan-600` (no es texto). Ningún componente referencia estos
  primitivos directamente salvo la excepción ya documentada del swatch de tema (§6.19) —
  todo lo demás usa `--color-primary`/`--color-primary-accent`/etc., así que el cambio de
  valor no requirió tocar ningún componente.
- **1.29.0** (2026-08-06): actualización del talonario/receta imprimible (§6.24,
  `RecetaImprimible`) — (1) membrete reemplazado por la versión nueva que compartió la
  odontóloga (agrega C.I./MPPS/COV debajo del nombre), mismo proceso de recorte con
  `sharp` sobre `public/logo-fabiola-marrero.png` → `public/logo-fabiola-marrero-
  recortado.png` (mismos nombres de archivo, no hizo falta tocar el componente para esa
  parte). (2) Pie de página nuevo debajo de la firma: teléfono de contacto + Instagram en
  la misma línea, en chico. El ícono de teléfono es un SVG propio en `--receta-morado`
  (path del ícono "phone" de Feather/Lucide, no dibujado a mano) — un emoji 📞 literal no
  se puede recolorear con CSS, por eso no se usó uno. El de Instagram es el logo real que
  compartió (`public/logo-instagram.png`, recortado igual que el membrete) — a diferencia
  del teléfono, ahí sí tiene sentido usar el archivo de marca tal cual, no un ícono propio.
- **1.28.0** (2026-08-06): talonario/receta imprimible de una cita finalizada — botón
  "Imprimir" en "Detalle de la cita" (`CitasTab`), nuevo componente `RecetaImprimible`
  (`src/components/citas/RecetaImprimible.tsx`). Sin librería de PDF: usa el propio
  `window.print()` del navegador. Nuevo patrón de infraestructura documentado en §6.24
  (`#print-root`, `src/app/layout.tsx`/`globals.css`) — reutilizable para cualquier futuro
  documento imprimible del sistema, no solo este. Campos (decididos con la odontóloga, sin
  Diagnóstico): Paciente, Edad (calculada de `paciente.fechaNacimiento`, reutiliza
  `calcularEdad` ya existente), Cédula, Fecha, Receta médica, Estudios complementarios —
  media carta (`@page { size: 5.5in 8.5in }`), con el membrete real de la odontóloga
  (`public/logo-fabiola-marrero-recortado.png`, recortado del PNG que compartió con
  `sharp`) y su paleta de marca personal (`#905ca2`, ver excepción documentada en §6.24).
  `CitasTab` pasa a recibir `paciente: Paciente` completo (antes solo `pacienteId`) — lo
  necesita para Edad/Cédula/Nombre del talonario.
- **1.27.0** (2026-08-06): logo real de la clínica reemplaza a los tres placeholders
  pendientes (Sidebar §6.8, login, favicon/PWA) — `public/logo-diente.png` (ícono del
  diente, provisto por la odontóloga; `public/logo-fabiola-marrero.png` queda reservado
  para el talonario/receta imprimible, todavía sin construir). Sidebar: el badge cuadrado
  con fondo `--color-primary` se retira, el logo se muestra directo (34×40px,
  `object-fit: contain`) — actualizado §6.8. Login (`src/app/login/page.tsx`): logo
  centrado arriba del título, sin componente propio documentado (pantalla mínima, T019).
  Favicon/PWA (`src/app/layout.tsx`, `public/manifest.json`): `icon-192.png`/
  `icon-512.png` regenerados a partir del logo real (con `sharp`, ya dependencia del
  proyecto) — cuadrado blanco con el diente centrado al 70%, dejando el margen de "safe
  zone" que requieren los íconos `"purpose": "any maskable"` para no recortarse al
  enmascarar en Android. Sin tokens nuevos.
- **1.26.0** (2026-08-06): rediseño de "Detalle de la cita" (`CitasTab` — boceto aprobado
  por el odontólogo) — pasa de un `Modal` centrado a un `Drawer` con acento (§6.17,
  actualizado con dos props nuevas opcionales: `subtitulo` y `acento`, sin efecto en los
  usos existentes de Antecedentes/Historial). `CitaDetalleSoloLectura` gana íconos por
  sección (Diagnóstico/Receta/Estudios), tarjetas para Motivo de consulta/Diagnóstico,
  lista de medicamentos con ícono circular por ítem y metadatos en negrita, y Estudios
  complementarios como recuadro tintado (mismo criterio que `Alert` `variant="info"`, §6.7).
  La línea de fecha/hora · categoría se extrajo a `CitaMetaLinea` (exportado junto a
  `CitaDetalleSoloLectura`) para poder pasarla como `subtitulo` del Drawer sin duplicar el
  formateo — `HistorialDrawer` no la usa porque ya la muestra en el encabezado de cada
  entrada expandible. Sin tokens nuevos: reutiliza `--color-primary`/`--color-primary-bg`/
  `--color-primary-accent`/`--color-info-bg` ya existentes.
- **1.25.0** (2026-08-04, `008-rediseno-visual-sistema`): adopción formal del rediseño
  visual "mockup DentalPro" que el odontólogo compartió (paleta más oscura/saturada tipo
  Material 3, tipografía Inter, radios de borde ampliados, sombras "soft-saas") como estilo
  oficial del sistema — tokens actualizados en §2.1/§2.3/§2.4, `TopAppBar` documentado en
  §6.20 (nuevo), tarjeta de métrica bento en §6.21 (nuevo), variante `"switch"` de `Tabs` en
  §6.22 (nuevo, ver nota de Principio VI abajo), tabla moderna en §6.5 (actualizada), ítem
  activo de la Sidebar en §6.8 (actualizado, borde derecho en vez de resplandor). Tabla de
  pantallas migradas vs. pendientes en §6.23 (nuevo) — a la fecha, solo Pacientes está
  migrada por completo; el resto del sistema sigue con el estilo anterior hasta que se migre
  pantalla por pantalla en specs futuras. Se corrigieron 4 bugs concretos encontrados por el
  odontólogo tras la primera pasada de este rediseño (aplicada sin pasar por specs, a su
  pedido explícito en su momento): (1) ícono de configuración con un ícono "sol" residual de
  un intento anterior superpuesto al engranaje real; (2) el botón de acción primaria de
  `TopAppBar` heredaba el subrayado/color de enlace por defecto del `<a>` de `next/link`; (3)
  `margin-left` duplicado entre `.content` (ShellLayout) y el `<main>` de la página de
  Pacientes, que empujaba el listado más a la derecha cuanto más ancha estaba la sidebar
  expandida (efecto inverso al esperado); (4) `TopAppBar`, al ser `position:fixed`, no
  quedaba compensado por el `margin-left` de `.content` y no conocía el estado de colapso de
  la Sidebar — se agregó `SidebarContext`/`useSidebarColapsada()` (nuevo,
  `src/components/ui/SidebarContext.tsx`) como fuente única de ese booleano para cualquier
  elemento fijo (documentado en §6.8). Además, se detectó y corrigió una violación del
  Principio VI introducida en la primera pasada: el toggle Activos/Archivados de Pacientes se
  había reimplementado desde cero en vez de reutilizar `Tabs` (§6.10) — se resolvió agregando
  la variante `"switch"` a `Tabs` en vez de mantener dos controles segmentados casi idénticos.
- **1.24.0** (2026-08-03): cuarta ronda de feedback sobre el Odontograma (§6.16) — la
  odontóloga probó la ronda anterior (1.23.0) en uso real y encontró tres problemas.
  (1) Scrollbar horizontal fantasma en la vista "Actual": `.diente` no tenía
  `flex-shrink:0`, así que un contenedor angosto lo comprimía por debajo de sus 52px, pero
  el overlay de líneas TRAMO seguía asumiendo el ancho sin comprimir — el scroll horizontal
  terminaba exponiendo ese sobrante como espacio en blanco en vez de dientes reales ("voy
  hacia la derecha y es puro espacio blanco", reporte textual). (2) El panel de herramientas
  seguía sin scroll propio real: el intento anterior (`align-items:stretch` en `.cuerpo`)
  asumía que el diagrama sería el hermano más alto, pero sin ningún ancestro de altura fija
  en este layout, stretch iguala ambos hermanos al *más alto* de los dos — con varias
  categorías del acordeón el panel es casi siempre más alto que las 2 filas de dientes, así
  que nunca llegaba a desbordar (nada que scrollear) y en cambio inflaba el diagrama con
  espacio en blanco. Reemplazado por un techo fijo e independiente
  (`max-height: min(600px, 70vh)` en `.panelScroll`, desactivado en `<640px`). (3) Historial
  redefinido de "una entrada por cada hallazgo agregado/editado/eliminado" a "una entrada
  por sesión de edición terminada": la odontóloga no quiere ver el historial llenarse con
  cada cambio individual, solo un "cómo se veía antes" cuando cierra edición. Nuevo tipo de
  entrada `CHECKPOINT` en `CambioOdontograma` (migración
  `add_checkpoint_tipo_cambio_odontograma`, enum de Postgres) — sin diente/hallazgo/nota
  propios, es un marcador de cierre de sesión, no un cambio puntual; se crea desde el nuevo
  use-case `registrarCheckpointsOdontogramaPaciente`, enganchado al botón "Listo" de la
  ficha (§6.12) y a "Finalizar atención" del Panel de Atención (§6.15), solo si hubo cambios
  granulares reales desde el último checkpoint. El log granular (AGREGADO/EDITADO/ELIMINADO)
  sigue registrando cada cambio sin excepción — Principio III no se toca, solo cambia qué se
  expone en la pestaña Historial.
- **1.23.0** (2026-08-03): tercera ronda de feedback sobre el Odontograma (§6.16), ya en
  uso real. (1) Deshacer/rehacer — pila de snapshots en memoria por dentición, con un
  nuevo use-case `restaurarSnapshotOdontograma` que audita cada restauración como una
  edición manual más (diff hallazgo por hallazgo), no un bypass silencioso. (2) Pestaña
  "Historial" (reemplaza el `Modal` `HistorialOdontogramaPanel`, retirado): reconstruye
  visualmente un momento pasado del odontograma a partir del log de auditoría, que ganó
  una columna `snapshot` (`CambioOdontograma`, migración `add_cambio_odontograma_snapshot`)
  con el estado completo del hallazgo/nota en cada cambio — sin guardar ninguna fila por
  fecha. (3) El panel de herramientas gana scroll vertical propio (antes empujaba toda la
  página) — `.cuerpo` con `align-items: stretch` explícito + `overflow-y:auto` acotado en
  el panel, mismo gotcha de flexbox (`min-height:0`) ya documentado para el diagrama. (2026-08-03): bug encontrado por la odontóloga en uso real — las condiciones
  "TRAMO" (Puente fijo, Edentulismo, Prótesis removible; §6.16) cambiaban de color
  correctamente en el panel de herramientas al marcarlas pendiente/realizado, pero la línea
  del diagrama se quedaba siempre con el color por defecto del catálogo, ignorando
  `hallazgo.estadoColor`. `DiagramaBoca.tsx` le pasaba a `LineaMultiDiente` el color
  estático de la condición en vez de resolverlo por hallazgo — se extrajo la lógica correcta
  (ya usada por `SimboloHallazgo` para el resto de las condiciones) a un helper compartido
  (`colorDeHallazgo`, `simboloUtils.tsx`) para que ambos caminos no puedan volver a
  divergir.
- **1.21.0** (2026-08-03): tres correcciones a `007-tema-apariencia` (§3.2.1, §3.2.2),
  feedback directo del odontólogo tras probar el tema morado en uso real — los tres eran
  bugs reales, no ajustes cosméticos. (1) Se agrega `--color-primary-bg` (fondo tintado que
  sigue el tema) y reemplaza a `--color-info-bg` en el ítem activo de la Sidebar (§6.8), la
  pestaña activa de `Tabs` (§6.10) y el hover del botón "Editar" de la ficha (§6.12) — con
  el tema morado activo esos tres elementos quedaban con fondo/resplandor celeste en vez de
  morado. `--color-info-bg` queda reservado para el `Alert` de tipo info, que si debe seguir
  celeste siempre. (2) El Avatar de iniciales de paciente (§6.9) usaba los primitivos
  `--color-cyan-700`/`--color-cyan-900` directo en 2 de sus 5 tonos rotativos — pasan a
  `--color-primary`/`--color-primary-active`, que sí siguen el tema. (3) Se agrega
  `--color-odontograma-azul` (§3.2.2), el único token semántico deliberadamente excluido del
  theming — el Odontograma (§6.16) usaba `--color-primary` para su convención clínica fija
  "azul = realizado", así que odontogramas ya guardados con marcas azules se veían morados
  con el tema morado activo; ahora el color clínico del Odontograma no depende de ningún
  tema de apariencia.
- **1.20.0** (2026-08-03): `007-tema-apariencia` — tema de apariencia configurable
  (§2.1, §3.2.1, §6.19). Se agrega la escala primitiva `--color-purple-*` (5 pasos, paralela
  a `cyan`) y el mecanismo `[data-theme="morado"]` que reasigna solo los 5 tokens semánticos
  de `--color-primary*`/`--color-ring` — estados (§3.3) quedan deliberadamente fuera del
  theming. Nuevo componente "selector de tema" (§6.19) en Configuración, con una excepción
  documentada al §2 (sus swatches referencian primitivos directamente, a propósito, para
  poder previsualizar la opción no activa). Documentado como consecuencia aceptada: el ítem
  activo de la Sidebar (§6.8) reutiliza `--color-info-bg`, que no cambia con el tema, por lo
  que con el tema morado activo queda fondo cyan claro + texto morado (cosmético, no
  funcional). Se retira "tema configurable por el usuario" de la lista de fuera de alcance en
  §7.
- **1.19.0** (2026-08-03): tres pedidos sueltos de la odontóloga, ya en uso real del
  sistema. (1) Columna "Última visita" en el listado de pacientes (§6.5) — fecha de la
  Cita finalizada más reciente. (2) El colapso/expansión de la Sidebar (§6.8) ahora anima
  (200ms, respeta `prefers-reduced-motion`) en vez de saltar instantáneo — aplica también
  al colapso forzado por ruta al navegar a `/citas/[id]` sin recargar la página. (3)
  Diagrama del Odontograma (§6.16) escalado 1.25x — la cruz de superficies era muy chica
  para tocar en celular; se verificó que sigue sin scrollbar propio en escritorio.
- **1.18.0** (2026-08-02): ajustes puntuales sobre la Fase 3, feedback directo de la
  odontóloga tras verla renderizada. (1) `FileInput` (§6.14) pasa de control nativo del
  navegador ("Choose File / No file chosen", se veía genérico) a botón personalizado con
  los tokens de `Button` variante primary + ícono de subir — técnica label+input oculto
  (`sr-only`, no `display:none`, sigue siendo enfocable por teclado), sin indicar "imagen o
  PDF" en el texto visible. (2) Se retira el botón "Ver odontograma" del encabezado de la
  ficha (§6.12): quedaba redundante con el tab Odontograma, que ya cubre el caso de un
  paciente archivado. (3) Dos bugs de overflow horizontal en mobile (`<640px`) encontrados
  al mover los tests de responsive del Odontograma de la ruta standalone al tab de la
  ficha: la variante "subrayado" de `Tabs` (§6.10.1) no scrolleaba sus 5 pestañas dentro de
  su propio contenedor, y el encabezado de la ficha no dejaba wrappear un nombre largo —
  mismo patrón de fix en los dos casos (`min-width:0`/`max-width:100%` en el contenedor,
  ya documentado para el diagrama del Odontograma en §6.16).
- **1.17.0** (2026-08-02): Fase 3, última del mismo lote de pedidos — pestaña Archivos de
  la ficha (§6.12) pasa de placeholder deshabilitado a funcional. Entidad nueva
  `ArchivoPaciente` (tabla propia en PostgreSQL, migración `add_archivo_paciente`),
  online-only sin espejo en Dexie, mismo patrón que `ArchivoEstudio` (005). Se retira el
  `FileInput` (§6.14) de `CitaDetalleSoloLectura` — la pestaña Archivos queda como único
  punto de entrada para subir archivos del paciente; los archivos ya subidos por la vía
  vieja (colgados de un Estudio) se siguen viendo igual en modo lectura, esa API no se
  tocó.
- **1.16.0** (2026-08-02): Fase 2 del mismo lote de pedidos — la ficha de paciente (§6.12)
  pasa de una sola Card larga a encabezado + pestañas. Nueva variante "subrayado" de `Tabs`
  (§6.10.1, con ícono y barra de color debajo del activo) sin tocar la variante "pill" que
  ya usa el Panel de Atención. Pestañas: Información (mismo contenido de siempre,
  reorganizado en tarjetas `--shadow-md` + nueva tarjeta "Datos del sistema"), Odontograma
  (embebido con toggle propio de ver/editar — `OdontogramaTab` gana la prop opcional
  `soloLectura`), Planes (placeholder deshabilitado) y Citas (tabla nueva, `CitasTab`).
  Archivos queda deshabilitada, se habilita en la próxima revisión (requiere backend
  nuevo). Los tres botones de acción (Nueva cita/Ver odontograma/Archivar-Reactivar) se
  relocalizan del footer de la Card vieja al encabezado nuevo, sin cambiar de
  comportamiento.
- **1.15.0** (2026-08-02): Fase 1 de un nuevo lote de pedidos de la odontóloga (ficha de
  paciente con pestañas, sidebar colapsable, botón "volver" reutilizable — el resto llega
  en próximas versiones). Dos cambios transversales, sin tocar ninguna pantalla todavía:
  (1) nuevo componente `VolverLink` (§6.18) que reemplaza tres links "← Volver a X"
  duplicados; (2) la Sidebar (§6.8) suma colapso manual en escritorio — antes solo se
  colapsaba forzada por ruta en el panel de Atención, ahora el usuario puede elegirlo en
  cualquier pantalla con un botón, persistido en `localStorage`. El estado de colapso pasa
  de calcularse dentro de `Sidebar.tsx` a calcularse en `layout.tsx` y bajar por props,
  para que `.content` compense el mismo ancho sin duplicar lógica.
- **1.14.0** (2026-08-02): correcciones sobre el rediseño 1.13.0, feedback directo de la
  odontóloga tras verlo renderizado — tres ajustes, no una reversión: (1) la sidebar de
  navegación (§6.8) ahora se colapsa sola a solo íconos en el panel de Atención (antes
  quedaba expandida, comiéndose ancho que el rediseño 1.13.0 ya le había ganado a la
  columna lateral); (2) Antecedentes vuelve a agruparse con Historial de citas anteriores
  en el `Drawer` (§6.17, §6.15) en vez de ser una pestaña separada, y el disparador del
  Drawer pasa de un botón en el encabezado a una pestaña fija al borde derecho de la
  pantalla; (3) el encabezado y las tarjetas de contenido pasan de `--shadow-sm` a
  `--shadow-md` (ambos tokens ya existían) y el encabezado suma `Avatar` `lg` (§6.9) — 1.13.0
  había quedado visualmente demasiado plano/blanco para el nivel de detalle de los bocetos
  de referencia.
- **1.13.0** (2026-08-02): rediseño visual del Panel de Atención (§6.15, segunda ronda de
  feedback con bocetos de referencia de la odontóloga) — más aire, sin la columna lateral
  fija de 320px. Antecedentes pasa de `Accordion` en la lateral a una 5ta pestaña; Historial
  de citas anteriores pasa a un `Drawer` nuevo (§6.17) que se abre a demanda desde el
  encabezado, con línea de tiempo (entradas expandibles en el lugar, ya no un `Modal`
  anidado por cita) en vez de lista plana. El encabezado gana edad/documento (antes solo el
  nombre). Receta y Estudios pasan de tarjetas apiladas a tabla, con el formulario de alta
  oculto detrás de un botón de borde punteado. `.pagina` sube de `max-width: 1200px` a
  `1600px`. Efecto directo en Odontograma (§6.16, embebido en esta pantalla): al liberar el
  ancho de la columna lateral, la arcada completa entra sin scroll horizontal en monitores
  de escritorio típicos — la forma de los dientes no cambió. Se agrega `motivo` (opcional) a
  `EstudioItem` para la columna "Indicación/Motivo" de la tabla de Estudios. Sin colores ni
  tipografía nuevos; el único token nuevo es el `max-width` de `.pagina`.
- **1.12.0** (2026-08-01): se agrega la pantalla Odontograma (`006-odontograma`, §6.16):
  diagrama de boca interactivo (catálogo de 44 condiciones en 8 categorías), panel de
  herramientas + leyenda, historial de cambios, y una tabla de plan de tratamiento que
  reemplaza el campo de texto libre equivalente que tenía la pestaña Diagnóstico del panel
  de Atención (§6.15, actualizado). Convención rojo/azul (pendiente/realizado) reutiliza
  `--color-error`/`--color-primary`, sin paleta nueva. `CardFooter` (§6.3) gana
  `flex-wrap: wrap` (bug de overflow en mobile encontrado con el cuarto botón de la ficha).
- **1.11.0** (2026-08-01): se agrega el panel de Atención (`005-atencion-paciente`, §6.15):
  Tabs central (Diagnóstico/Receta/Estudios/Odontograma-placeholder) + panel lateral
  colapsable con dos acordeones (Antecedentes/Historial de citas anteriores), decidido tras
  discutir el diseño con el odontólogo. Se agregan los componentes `Accordion` (§6.13,
  secciones colapsables independientes, a diferencia de Tabs que es exclusivo) y
  `FileInput` (§6.14, selector de imagen/PDF, mismo lenguaje visual que Input). En `<640px`
  el panel lateral se abre como `Modal` a pantalla completa en vez de un `Drawer` nuevo —
  `Modal` ya resolvía ese comportamiento. Sin colores, tipografía ni espaciado nuevos.
- **1.10.0** (2026-07-31): ajustes al listado de pacientes (§6.5): la búsqueda por
  documento ahora compara contra los dígitos de la cédula (sin el prefijo V-/E-, que es un
  detalle de guardado, no algo que el odontólogo tipea). Columna F. Nacimiento reemplazada
  por Edad calculada (mismo criterio que la ficha, §6.12). Se sacan las columnas Estado
  (redundante con las pestañas Activos/Archivados, §6.10) y Acciones (nunca tuvo contenido).
- **1.9.0** (2026-07-31): se agrega la sección "Historia clínica" (`003-historia-clinica-paciente`)
  al formulario (§6.11) y a la ficha en modo lectura (§6.12): checklist de 21 antecedentes
  personales patológicos + "Otros" con texto libre condicional, y 3 campos de texto libre
  (heredofamiliares, medicamentos actuales, alergias). Se agregan los componentes `Checkbox`
  y `Textarea` (§6.2), ambos reutilizando los tokens de borde/foco/error ya existentes — sin
  colores, tipografía ni espaciado nuevos.
- **1.8.0** (2026-07-31): se agregan Estado civil y Ocupación (formulario y ficha, §6.11 y
  §6.12) y la Edad calculada en la ficha (nunca guardada). Género pasa de 4 a 3 opciones
  (se saca "Prefiero no decir", a pedido del usuario). La columna Documento del listado
  (§6.5) y el campo del mismo nombre en la ficha ahora muestran el valor formateado
  (`V-29.838.893`), no el crudo. Tabs (§6.10) gana borde y sombra — más contraste sobre
  el fondo de la pantalla.
- **1.7.0** (2026-07-31): la edición de paciente deja de tener un formulario propio y pasa
  a reutilizar `PacienteFormulario` (mismo componente que el alta, a pedido del usuario).
  Se rediseña la ficha en modo lectura (§6.12): `Avatar` `lg` (64px, nuevo) en el
  encabezado, secciones con ícono iguales a las del formulario, campos como ícono+label+
  valor en vez de líneas `Label: valor`. Mismo ancho que el formulario.
- **1.6.0** (2026-07-31): "Nuevo paciente" se ensancha a `max-width: 1100px` y §6.11 pasa a
  usar una grilla de 3 columnas en "Datos personales" (Documento/Fecha/Género en una fila,
  como en el mockup) y 2 en "Información de contacto". Se agrega el campo compuesto
  Documento de identidad (selector V-/E- + número con puntos de miles al escribir) y
  placeholders en los campos de texto libre.
- **1.5.0** (2026-07-31): rediseño de "Nuevo paciente" (mockup del usuario) + campo Género.
  Se agrega el componente Select (§6.2, mismos tokens que Input) y §6.11 Formulario en
  secciones (grilla de 2 columnas con títulos de sección, y notas al pie informativas que
  reutilizan los fondos de Alert sin `role="alert"`). Sin colores nuevos.
- **1.4.0** (2026-07-31): rediseño visual de `001-gestion-pacientes` (mockup del usuario).
  Se agregan §6.9 Avatar (rotación de 5 tonos ya existentes, research.md #13) y §6.10 Tabs
  (reutiliza el patrón de "activo" de la Sidebar §6.8). Se actualiza §6.5 Table: tabla
  semántica real, columnas nuevas (avatar+email, fecha formateada), y pie de paginación
  (research.md #11). Sin colores nuevos en ningún caso.
- **1.3.1** (2026-07-31): revisión de la sección 6.8 tras feedback visual sobre
  `002-pantalla-inicio` — sidebar más angosta (`208px`/`64px`), se agrega logo (placeholder)
  y tarjeta de perfil al pie (reemplaza el ítem de lista "Configuración"), se agrega el
  ítem "Inicio", "Cerrar sesión" pasa a `--color-error`, y el ítem activo suma un
  resplandor (`--color-ring`) sobre el fondo `--color-info-bg`. Sin tokens nuevos.
- **1.3.0** (2026-07-31): se agregó la sección 6.8 (Sidebar / Navegación), requerida por
  `002-pantalla-inicio` — primera sidebar del sistema. Reutiliza tokens de color/espaciado
  ya existentes; sin paleta ni escala nuevas.
- **1.2.0** (2026-07-30): se agregó la sección 4.0 (breakpoints y comportamiento
  responsive — celular/tablet/escritorio), requerida por la actualización del Principio VI
  en la constitución. Se confirmó la escala de espaciado base 4px sin cambios. Se renumeró
  el inventario de componentes (antes sección 5) a sección 6, y gobierno a sección 7.
- **1.1.1** (2026-07-30): se agregó el token de familia tipográfica que faltaba
  (`--font-family-base`, system-ui) — ya decidido con el odontólogo pero no había quedado
  escrito. Radios de borde y sombras revisados y confirmados sin cambios.
- **1.1.0** (2026-07-30): reemplazo de la paleta de ejemplo genérica por la paleta real
  definida junto al odontólogo (cian/teal/slate + rojo/ámbar), con dos tonos hermanos
  agregados donde el color elegido no alcanzaba el contraste mínimo de la sección 4.
- **1.0.0** (2026-07-30): versión inicial, alcance limitado a `001-gestion-pacientes`.

**Versión**: 1.30.0 | **Creado**: 2026-07-30
