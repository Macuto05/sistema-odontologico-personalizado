# Investigación: mapa anatómico "experto" para el Odontograma

**Estado**: exploratorio, no aprobado para implementar. Documentado a pedido de la
odontóloga (2026-08-03) para tenerlo como referencia cuando se decida retomarlo — no
forma parte de ningún plan activo. No modifica `docs/design-system.md` ni ningún código.

## 1. Qué se está evaluando

La odontóloga trajo un sistema de referencia (bocetos con marca de agua
`patients.odontogram.tools.*`) cuyo odontograma tiene dos capas de interacción:

1. **Vista general**: una imagen de la arcada completa (dientes superiores adultos, fila
   intermedia de dientes de niño, inferiores adultos) donde pasar el mouse sobre un diente
   lo resalta en azul antes de hacer clic.
2. **Modal por diente**: al hacer clic, se abre una vista ampliada de *ese* diente
   específico con un mapa de zonas anatómicas reales (no una cruz de 5 casillas) — cada
   sub-zona de cada cara es clickable por separado (ej. "Lingual Zona Media Distal",
   "Oclusal Mesial Expansión"), con feedback visual (rojo/azul) exactamente en la
   sub-zona tocada.

Confirmado con la odontóloga: la clasificación en sí (cruz + diente genérico, adulto/niño
por pestañas) **se mantiene** — es el método tradicional que ya está validada
clínicamente. Lo que se evalúa es *únicamente* llevar la fidelidad visual/anatómica del
diente y sus zonas a ese nivel.

## 2. Qué tenemos hoy (arquitectura real, no aproximada)

- **Un solo contorno de diente, compartido por los ~64 dientes posibles**
  (`src/components/odontograma/contornoDiente.ts`, `CONTORNO_CORONA`) — un path SVG
  genérico de silueta de corona, igual para un incisivo que para un molar. No hay
  variación por tipo de pieza.
- **Superficies como grilla, no como geometría**: `DienteSvg.tsx` renderiza la "cruz" como
  5 `<button>` en un CSS grid (`arriba/izquierda/centro/derecha/abajo`), *no* como 5
  regiones recortadas sobre la forma real del diente. Cada botón es un cuadrado con
  posición fija, decorativo — no hay hit-testing geométrico sobre un path.
- **Modelo de datos — `Superficie` es un enum cerrado de 5 valores**
  (`src/domain/entities/Odontograma.ts`, espejado en `prisma/schema.prisma`):
  `MESIAL | DISTAL | VESTIBULAR | PALATINO_LINGUAL | OCLUSAL_INCISAL`. Universal para
  todos los dientes — un incisivo y un molar comparten exactamente el mismo vocabulario de
  zonas, aunque anatómicamente un molar tiene más sub-regiones relevantes (cúspides,
  fosas) que un incisivo.
- **Catálogo de condiciones** (`CondicionOdontograma.ts`, 44 condiciones): cada condición
  ya declara si aplica a diente completo o a superficie específica, contra este mismo
  enum de 5 valores.

Esto importa porque el sistema de referencia claramente **no** usa 5 zonas universales —
usa un vocabulario de zonas más fino y específico por tipo de diente (las etiquetas
"Zona Media Distal", "Mesial Expansión" no existen en nuestro modelo).

## 3. Qué exige realmente "llevarlo a ese nivel" — dos capas de esfuerzo muy distintas

### 3.1 Capa A — Vista general más realista (esfuerzo moderado)

Reemplazar el contorno único genérico por formas reales por tipo de diente (incisivo
central, incisivo lateral, canino, premolar, molar — con variantes superior/inferior).
Con mirroring (izquierda/derecha), esto son realistas **~8 a 10 formas de diente
distintas** para el set adulto, más un set reducido para dientes temporales.

Esto **no** requiere tocar el modelo de datos — sigue siendo "diente completo" vs
"superficie" con el mismo enum de 5 valores. Es un cambio de arte + `DienteSvg.tsx` (elegir
la forma según el número FDI), no de dominio/persistencia.

### 3.2 Capa B — Modal por diente con zonas anatómicas finas (esfuerzo grande)

Esto es lo que muestran las capturas 2-4 de la odontóloga. Implica:

- **Arte SVG con hit-regions reales**: cada forma de diente (las mismas ~8-10 de la Capa
  A) necesita, además de su silueta, un path *por sub-zona* clickable, dibujado con
  precisión anatómica (no decorativo). Un molar tiene más sub-zonas relevantes que un
  incisivo — los sets de paths no son intercambiables entre tipos de diente.
- **Vocabulario de zonas más fino, y distinto según tipo de diente**: pasar de 5 valores
  universales a algo como "zona mesial/distal/media" cruzado con cada cara, lo cual deja
  de ser un enum universal — un incisivo no tiene las mismas sub-zonas oclusales que un
  molar (un incisivo no tiene "oclusal" en sentido estricto, tiene borde incisal). Esto es
  **un cambio de modelo de dominio**, no solo de UI:
  - `Superficie` (dominio + `prisma/schema.prisma`) pasa de 5 valores fijos a un catálogo
    más grande, probablemente parametrizado por tipo de diente en vez de un enum plano
    único.
  - `CondicionOdontograma.ts` — cada condición que hoy dice "aplica a superficie
    específica" tendría que revisarse: ¿aplica a cualquier sub-zona nueva, o solo a un
    subconjunto clínicamente correcto? (ej. ¿tiene sentido "Caries" en una micro-zona
    "oclusal mesial expansión" vs solo "oclusal"? Requiere criterio clínico de la
    odontóloga para cada condición, no es una decisión de ingeniería.)
  - **Compatibilidad con hallazgos ya registrados**: los hallazgos existentes quedaron
    guardados con el enum viejo (5 valores). Ampliar el enum es aditivo y seguro
    (`ALTER TYPE ... ADD VALUE`, sin migración de datos), pero los hallazgos históricos
    **no se pueden reclasificar automáticamente** a la zona fina correspondiente — quedan
    con su valor "grueso" para siempre, salvo que alguien los edite a mano. Esto es
    aceptable (es el mismo criterio que ya se usa en otros lados del sistema para campos
    agregados después), pero hay que decidirlo explícitamente, no es gratis.
  - **Nuevo componente**: un modal de "diente ampliado" (`DienteDetalleModal` o similar)
    que reemplace o complemente el flujo actual de selección — con su propio hit-testing
    por zona, tooltip de "en qué zona estoy" (como muestra la 4ta captura), y su propio
    estado de hover/selección independiente del diente chico en la arcada general.

## 4. De dónde saldría el arte SVG

No hay ninguna librería open-source de odontogramas ya integrada en este proyecto ni
evaluada — sería una línea de investigación aparte si se quiere ir por esa vía. Opciones,
de menor a mayor control/costo:

1. **Sets de íconos médicos/dentales con licencia** (bancos de assets): rápido, pero la
   precisión anatómica y el estilo visual son una lotería — probablemente haya que
   retocarlos igual.
2. **Trazar desde un atlas dental de referencia**: un diseñador (o alguien con Illustrator/
   Figma y paciencia) recrea las ~8-10 formas + sus sub-zonas a partir de diagramas
   odontológicos estándar. Control total del estilo, pero requiere tiempo dedicado y, para
   que las zonas sean clínicamente correctas, validación de la odontóloga en cada forma.
3. **Encargarlo a un ilustrador especializado**: más caro/lento pero es la vía con menos
   riesgo de terminar con anatomía incorrecta.

En cualquier caso, la revisión clínica de la odontóloga sobre cada forma y cada frontera
de zona es un paso obligatorio, no opcional — es el tipo de detalle que un ingeniero no
puede validar por su cuenta.

## 5. Riesgos a tener en cuenta si se retoma

- **Precisión clínica**: una zona mal delimitada puede inducir un registro incorrecto
  (marcar "distal" cuando el clic cayó en "mesial" por un path mal ajustado) — el costo de
  un error acá es más alto que en un botón de UI cualquiera.
- **Mobile/táctil**: zonas anatómicas finas son, por definición, más chicas que los 5
  botones actuales — en una pantalla de celular, tocar la zona correcta con el dedo es
  bastante más difícil que con mouse. El sistema de referencia parece pensado para
  mouse/escritorio; habría que resolver una interacción táctil viable (¿zoom automático al
  tocar un diente en mobile, como ya insinúa el propio modal de "diente ampliado" del
  sistema de referencia?).
- **Mantenimiento**: cada condición nueva que se agregue al catálogo en el futuro (hoy 44,
  puede crecer) potencialmente necesita revisión de a qué zonas finas aplica — más
  superficie de mantenimiento que hoy, donde solo hay 5 valores posibles.
- **Alcance de "expertise"**: esto empieza a superponerse con lo que se definió
  explícitamente fuera de alcance en 006-odontograma (el periodontograma, herramienta
  clínica distinta con mediciones por sitio) — no es lo mismo, pero comparte la lógica de
  "cuanta más precisión clínica, más carga de mantenimiento y validación", vale la pena
  tenerlo en mente al decidir cuánta inversión vale la pena acá.

## 6. Camino recomendado, en fases (si algún día se retoma)

| Fase | Qué incluye | Toca modelo de datos | Esfuerzo relativo |
|---|---|---|---|
| **0** (ya sugerida, no implementada) | Pulido visual sobre lo actual: resaltado azul al pasar el mouse, modal de selección más prolijo — mismas 5 superficies, mismo contorno genérico | No | Días |
| **1** | Formas reales por tipo de diente en la vista general (Capa A) — sin cambiar cómo se seleccionan superficies | No | 1-2 semanas, mayormente arte |
| **2** | Modal de diente ampliado con zonas anatómicas finas (Capa B) — el nivel que muestran las capturas | Sí (enum `Superficie` más fino, revisión del catálogo por la odontóloga, decisión sobre hallazgos históricos) | Varias semanas, incluye tiempo de un diseñador/ilustrador y varias rondas de validación clínica |

La Fase 2 es la única que realmente iguala lo que se vio en las capturas — las Fases 0 y 1
mejoran la percepción visual pero mantienen el modelo tradicional de 5 superficies.

## 7. Recomendación

No hay ningún bloqueo técnico — es todo construible. La pregunta real es de costo/beneficio:
la Fase 2 es una inversión considerable (arte + cambio de modelo + validación clínica
condición por condición) para un beneficio que es principalmente estético/percibido, dado
que el método de 5 superficies ya está clínicamente aprobado. Tiene sentido dejarlo en
"planes futuros" como está ahora, y decidir si se retoma después de tener más uso real del
sistema — en ese momento va a ser más claro si la precisión anatómica fina realmente hace
falta en el uso diario, o si el pulido de la Fase 0/1 ya deja la sensación de "otro nivel"
que se buscaba.
