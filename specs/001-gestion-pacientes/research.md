# Research: Gestión de Pacientes

Fase 0 del plan. La mayoría de las decisiones de arquitectura de esta feature se
resolvieron por consulta directa con el usuario (no son incógnitas de investigación) — se
documentan igual en formato Decision/Rationale/Alternatives para que queden trazables.
Algunas decisiones mecánicas de menor nivel (formato de ID, mecánica exacta de batching) se
resolvieron acá como parte de esta fase.

## 1. Framework y lenguaje

- **Decision**: TypeScript + Next.js (App Router), un solo codebase para UI y API.
- **Rationale**: El usuario ya tiene experiencia con este stack; Next.js soporta PWA/service
  worker y una app responsive de un solo código, que es exactamente lo que pide el
  Principio VI de la constitución.
- **Alternatives considered**: Python (Django/FastAPI) + frontend separado — descartado,
  agrega un segundo lenguaje y un límite frontend/backend que no aporta valor a un sistema
  de un solo usuario. App de escritorio (Electron) por dispositivo — descartada, complica
  la sincronización entre 3 dispositivos de tipos distintos (celular no corre Electron).

## 2. Arquitectura offline-first

- **Decision**: la UI lee/escribe siempre contra IndexedDB (vía Dexie.js) en el
  dispositivo; nunca depende de la red para una operación básica. Un "outbox" local en
  Dexie encola cada mutación pendiente de enviar al servidor.
- **Rationale**: confirmado con el usuario — se atiende a pacientes sin acceso a internet
  en algunos momentos/lugares; el sistema no puede depender de conectividad para funciones
  básicas (Constraints de Technical Context).
- **Alternatives considered**: RxDB (replicación HTTP incorporada) y ElectricSQL/PowerSync
  (motores de sync en tiempo real) — descartados por desproporcionados: están pensados para
  sincronización multiusuario/colaborativa, y este sistema tiene un solo usuario
  sincronizando sus propios dispositivos (Principio V, YAGNI).

## 3. Identificadores de paciente

- **Decision**: el ID de un paciente se genera en el cliente (UUID v4) en el momento de la
  creación, no lo asigna el servidor.
- **Rationale**: una ficha creada completamente offline necesita un ID definitivo de
  inmediato (para navegar a ella, referenciarla, editarla, archivarla) sin esperar a que el
  servidor la confirme. Un ID autoincremental de servidor obligaría a un ID temporal local y
  a remapear referencias tras sincronizar — complejidad evitable.
- **Alternatives considered**: ID autoincremental de PostgreSQL con remapeo posterior —
  descartado por la complejidad de remapeo. ID temporal + reemplazo — descartado por la
  misma razón.

## 4. Mecánica de sincronización por lotes

- **Decision**: el motor de sync escucha el evento `online` del navegador y reintenta cada
  cierto intervalo mientras haya operaciones pendientes; envía como máximo ~20 operaciones
  por request; cada operación lleva su UUID de paciente como clave de idempotencia, de modo
  que reintentar un lote tras un corte de conexión no vuelve a aplicar una operación ya
  procesada por el servidor.
- **Rationale**: cumple literalmente lo que pidió el usuario ("enviando la información por
  lote poco a poco"), sin sobrecargar una sola request ni perder progreso si la conexión se
  corta a mitad de un lote.
- **Alternatives considered**: enviar todo el outbox en una sola request — descartado,
  frágil ante conexiones inestables (típicas de "a veces hay señal, a veces no").

## 5. Resolución de conflictos

- **Decision**: si el mismo paciente fue editado offline en dos dispositivos distintos antes
  de que cualquiera sincronizara, el servidor conserva ambas ediciones como entradas
  separadas (nunca sobrescribe silenciosamente) y marca el registro para revisión manual del
  odontólogo.
- **Rationale**: obligación directa del Principio III (integridad y auditoría — nunca
  descartar una corrección silenciosamente). Dado que es un solo usuario en sus propios
  dispositivos, este caso será raro, pero no puede resolverse perdiendo datos.
- **Alternatives considered**: last-write-wins por timestamp — descartado, podría descartar
  silenciosamente una edición válida, violando el Principio III.

## 6. Base de datos y ORM

- **Decision**: PostgreSQL vía Prisma ORM.
- **Rationale**: confirmado con el usuario; Prisma parametriza consultas por construcción
  (Principio VII) y maneja migraciones reversibles (Principio III). PostgreSQL se aloja
  centralizadamente, accesible desde los tres dispositivos.
- **Alternatives considered**: SQLite — descartado, complica el acceso centralizado desde
  múltiples dispositivos sin un servidor propio adicional.

## 7. Autenticación

- **Decision**: Auth.js (NextAuth), configurado para una única cuenta (credentials
  provider), con contraseña hasheada (bcrypt/argon2) y sesión en cookie httpOnly segura.
- **Rationale**: confirmado con el usuario, priorizando facilidad de extensión futura sobre
  el mínimo código posible.
- **Alternatives considered**: autenticación mínima a medida — descartada por el usuario a
  favor de Auth.js.

## 8. Validación

- **Decision**: Zod para esquemas de validación, usados tanto en los casos de uso
  (`application/`) como en el límite de las rutas de API.
- **Rationale**: TypeScript-first, infiere tipos desde el esquema (evita duplicar
  definiciones), y permite validar en el límite de dominio/caso de uso como exige el
  Principio III, no solo en la UI.
- **Alternatives considered**: Yup — descartado, peor inferencia de tipos en TS. Validación
  manual — descartada, más código repetido y más propenso a errores.

## 9. Testing

- **Decision**: Vitest para unit/integration (dominio, casos de uso, rutas de API); 
  Playwright para e2e, incluyendo un escenario que simula modo avión (offline) seguido de
  reconexión para validar la sincronización por lotes.
- **Rationale**: soporte moderno de primera clase para TypeScript/ESM y Next.js; Playwright
  permite emular condiciones de red (offline/online) necesarias para probar el Principio de
  funcionamiento sin internet.
- **Alternatives considered**: Jest — descartado, configuración más pesada para ESM/Next.js
  actual. Cypress — descartado, Playwright tiene mejor soporte multi-browser y de emulación
  de red para este caso de uso específico.

## 10. App-shell offline (Service Worker) — descubierto durante la implementación

- **Decision**: `@ducanh2912/next-pwa` (Workbox), deshabilitado en desarrollo, activo solo
  en build de producción.
- **Rationale**: al implementar el escenario offline se descubrió que la arquitectura
  local-first (Dexie + outbox, decisión #2) solo resuelve la mitad del problema — sin un
  Service Worker cacheando el shell de la app (HTML/JS/CSS), el navegador ni siquiera puede
  cargar una página sin conexión (`net::ERR_INTERNET_DISCONNECTED`), sin importar qué tan
  bien esté armada la capa de datos. A diferencia del motor de sync (donde armar algo
  casero tenía sentido, decisión #2), acá se usó una librería: el patrón correcto de
  cacheo de shell + fallback de navegación es fácil de dejar funcionando a medias si se
  arma a mano, y el costo de un Service Worker mal armado (contenido obsoleto servido,
  navegación rota) es peor que la complejidad de traer una dependencia.
- **Alternatives considered**: Service Worker escrito a mano — descartado por el riesgo de
  acertar mal el patrón de cacheo/fallback. Sin Service Worker — descartado, viola
  directamente el requisito de funcionamiento offline (constitution.md Principio VI).
- **Efecto colateral en el producto**: crear un paciente ya no navega a su ficha
  (`/pacientes/<id>`), sino que vuelve al listado (`/pacientes`). La ficha es una URL con
  un id nuevo en cada creación, que el Service Worker nunca pudo haber cacheado de
  antemano — navegar ahí falla si la creación fue offline. El listado sí está cacheado
  (se visita al iniciar sesión) y el paciente nuevo aparece ahí de inmediato vía
  `useLiveQuery` sobre Dexie. Ver `src/app/(shell)/pacientes/nuevo/page.tsx`.

## 11. Paginación en dos capas — descubierto durante el rediseño visual

- **Decision**: paginar la pantalla y la sincronización de fondo por separado, con
  mecanismos distintos, en vez de una sola solución genérica.
- **Rationale**: al pedir "paginar en lotes de 10 con prácticas de escalabilidad" se
  encontraron dos problemas de escalabilidad distintos, no uno. La pantalla
  (`(shell)/pacientes/page.tsx`) renderizaba el resultado completo sin límite. Pero el
  problema más serio era otro: `pullCambiosDesdeServidor()` (decisión #4) pedía **toda** la
  tabla de pacientes cada 30s (`GET /api/patients?estado=TODOS`), sin filtro ni límite — a
  miles de pacientes, eso es una consulta pesada y repetida contra PostgreSQL, el
  verdadero riesgo de "reventar la base". La paginación de pantalla se resuelve contra
  Dexie local (instantánea, sin red); la de sincronización necesita filtrar por lo que
  cambió (ver decisión #12).
- **Alternatives considered**: paginación única "una talla para todos" en el mismo lugar —
  descartada, mezclar ambos problemas hubiera dejado sin resolver el más importante (la
  sincronización) mientras se resolvía el menos importante (la pantalla).

## 12. Sincronización incremental (`desde`) — corrige la decisión #4

- **Decision**: `GET /api/patients` gana un parámetro opcional `desde` (timestamp ISO);
  cuando está presente, filtra por `updatedAt > desde` en vez de traer todo. El motor de
  sync guarda un `ultimaSincronizacion` en una tabla nueva de Dexie (`metaSync`) y lo usa en
  cada ciclo. La primera sincronización de un dispositivo nuevo (sin `ultimaSincronizacion`
  todavía) pagina en lotes (`pagina`/`limite`) en vez de traer todo en una sola respuesta.
- **Rationale**: en régimen normal (después de la primera vez), la respuesta de cada ciclo
  de 30s es chica — solo lo que cambió — sin importar cuántos pacientes totales existan.
  Es el mismo patrón de "delta sync" que cualquier sistema offline-first necesita en algún
  momento; quedó pendiente hasta que el rediseño visual obligó a mirar de nuevo el motor de
  sync.
- **Alternatives considered**: seguir trayendo todo pero con menos frecuencia (ej. cada 5
  min en vez de 30s) — descartado, no resuelve el problema de fondo, solo lo hace menos
  frecuente; a suficiente escala de pacientes sigue siendo una consulta pesada.

## 13. Paleta de avatares — reutilización, no colores nuevos

- **Decision**: los avatares circulares con iniciales (mockup del usuario) rotan por 5
  tonos que **ya existen** en la paleta y ya están validados con contraste ≥4.5:1 sobre
  blanco: `--color-cyan-700`, `--color-cyan-900`, `--color-teal-700`, `--color-slate-500`,
  `--color-slate-700`. Se excluyen a propósito rojo y ámbar (error/advertencia).
- **Rationale**: el Principio VI exige justificar cualquier color nuevo antes de agregarlo;
  acá no hizo falta agregar ninguno — reutilizar tonos ya vetados da variedad visual sin
  ampliar la paleta. Excluir rojo/ámbar evita que un avatar "por casualidad" del mismo color
  que un estado de error/advertencia se lea como una señal semántica que no es.
- **Alternatives considered**: un solo color (el primario) para todos los avatares —
  descartado por el usuario, quería más variedad visual como en el mockup. Colores nuevos
  específicos para avatares — descartado, innecesario cuando la paleta existente ya
  alcanza y evita el trabajo de justificar/validar contraste de tonos nuevos.

## 14. Navegación post-alta: directo a la ficha, pero solo con conexión real

- **Decision**: al crear un paciente, si hay conexión real se navega directo a su ficha
  (`/pacientes/[id]`); si no, se cae al listado (comportamiento previo). La verificación de
  conexión (`src/components/pacientes/conectividad.ts#hayConexionReal`) hace un `fetch`
  corto y real contra `/api/patients`, **no** usa `navigator.onLine`.
- **Rationale**: se probó explícitamente (offline, id nunca visitado, y también habiendo
  visitado antes la ficha de otro paciente) si el Service Worker podía servir la ficha
  recién creada sin conexión — falla siempre con `net::ERR_FAILED`, incluso con
  `cacheOnFrontEndNav`/`aggressiveFrontEndNavCaching` activados (`next.config.mjs`): esas
  opciones cachean URLs ya visitadas, no pueden anticipar un id que no existía antes. No
  hay forma de evitarlo sin un hack de Service Worker de alto riesgo (servir un shell
  genérico como fallback de navegación y esperar que la hidratación de Next.js lo resuelva
  correctamente para una ruta dinámica distinta — no soportado, frágil).
- **`navigator.onLine` no sirve para decidir esto**: se intentó primero como condición
  (mucho más simple). Falla en la práctica — una página cargada mientras ya está offline no
  actualiza `navigator.onLine` hasta que un request de verdad falla, así que reporta `true`
  incluso sin conexión real (reproducido de forma consistente en pruebas e2e). MDN
  documenta la misma limitación para navegadores/SO reales, no es solo un artefacto de la
  emulación de Playwright. Por eso se reemplazó por una prueba de conectividad real y
  corta, con timeout, antes de decidir el destino.
- **Alternatives considered**: navegar siempre a la ficha y dejar que Next.js haga su
  propio fallback — descartado, confirmado que el fallback de Next.js también intenta red
  (mensaje de consola "Falling back to browser navigation") y termina en una página de
  error del navegador, peor experiencia que quedarse en el listado. Navegar siempre al
  listado (comportamiento anterior, sin condición) — descartado, pierde la mejora para el
  caso común (con conexión) sin necesidad.

## 15. Búsqueda por documento: comparar dígitos, no el valor guardado completo

- **Decision**: `q` se normaliza quitando todo carácter no numérico, y se compara con
  `contains` (no `endsWith`) contra el `documentoIdentidad` guardado — tanto en
  `PacienteRepositoryPrisma` como en `PacienteRepositoryDexie`. Si `q` no tiene dígitos, se
  cae a la igualdad exacta de antes (caso residual, no el uso real esperado).
- **Rationale**: bug real reportado por el usuario, en dos vueltas. Primero: `documentoIdentidad`
  se guarda como `V29838893` (prefijo pegado, decisión de research.md sobre
  `DocumentoIdentidadInput`), pero la comparación de búsqueda era una igualdad exacta contra
  todo el string — un odontólogo que tipea la cédula tal cual la conoce (`29838893`, sin el
  prefijo) nunca matcheaba. Se arregló con `endsWith` sobre los dígitos, pero el usuario
  reportó que seguía sin andar bien: con `endsWith` hacía falta escribir la cédula
  **completa** para que apareciera algo, porque escribir solo los primeros dígitos (`29`,
  `298`...) nunca "termina" en esos dígitos. La búsqueda por nombre sí filtra en tiempo real
  con cada letra escrita (`contains`) — el usuario esperaba, correctamente, el mismo
  comportamiento para el documento. `contains` sobre los dígitos normalizados da ambas cosas
  a la vez: no hace falta el prefijo, y filtra progresivamente como se espera.
- **Alternatives considered**: pedirle al usuario que escriba el prefijo — descartado, no es
  razonable esperar que alguien sepa/recuerde ese detalle interno. Guardar el número sin
  prefijo en una columna aparte solo para búsqueda — descartado, duplica el dato guardado
  para resolver algo que una normalización en la consulta ya resuelve sin tocar el esquema.
  `endsWith` (intento anterior) — descartado, no filtra en tiempo real mientras se escribe,
  solo al completar el número exacto.
