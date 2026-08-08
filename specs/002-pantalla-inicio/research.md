# Research: Pantalla de Inicio (Home) del Sistema

## 1. ¿Configuración (perfil del odontólogo) sigue el patrón local-first de Pacientes?

**Decision**: No. Configuración (nombre, email, contraseña) es una pantalla online-only:
toda escritura va directo contra `/api/account*`, sin paso por Dexie ni por el outbox.

**Rationale**: El cambio de contraseña necesita verificar la contraseña actual contra
`Usuario.passwordHash` (bcrypt), y ese hash no debe existir nunca en IndexedDB —
replicarlo al cliente para "completar" el patrón local-first sería una regresión de
seguridad (Principio VII). Dado que al menos una de las tres acciones de la pantalla
(cambiar contraseña) ya depende de conexión, tratar las otras dos (nombre, email) como
offline-first crearía una experiencia inconsistente dentro de la misma pantalla y
obligaría a construir una segunda tabla Dexie + un segundo camino de outbox para
`Usuario`, solo para un caso de uso de baja frecuencia (el odontólogo no edita su propio
perfil "entre pacientes" como sí busca fichas). Confirmado explícitamente con el usuario
antes de fijar esta decisión.

**Alternatives considered**:
- *Nombre/email offline (Dexie+outbox), solo contraseña online*: más fiel a la letra del
  patrón local-first ratificado, pero duplica infraestructura de sync para una pantalla
  de uso raro (viola Principio V, YAGNI) y da un comportamiento distinto campo por campo
  en la misma pantalla, lo cual es confuso para el usuario (¿por qué se guardó el nombre
  sin conexión pero la contraseña no?).
- *Replicar `passwordHash` a IndexedDB para permitir verificación local*: descartado de
  inmediato — viola directamente el Principio VII (el hash de contraseña no debe
  transmitirse ni almacenarse fuera del servidor salvo lo estrictamente necesario para
  autenticar).

## 2. ¿Cómo se agrega `nombre` a `Usuario` y se expone en la sesión?

**Decision**: Se agrega la columna `nombre String` a `Usuario` en `prisma/schema.prisma`
(migración de Prisma). En `src/infrastructure/auth/auth.config.ts`, `authorize()` agrega
`nombre` al objeto devuelto, y se agregan callbacks `jwt` y `session` (hoy no existen
explícitamente — Auth.js usa el comportamiento default) para copiar `nombre` del usuario
autenticado al token JWT y de ahí a `session.user.nombre`. Así el saludo se lee desde
`useSession()`/`getServerSession(authOptions)` sin ninguna consulta adicional a
Prisma ni a Dexie en el primer render.

**Rationale**: Evita una llamada de red extra solo para mostrar el nombre (Principio
VIII); reutiliza el mecanismo de sesión ya construido en `001-gestion-pacientes` en vez de
crear un endpoint `/api/me` nuevo para un dato que ya cabe en el JWT.

**Alternatives considered**:
- *Endpoint `/api/account` que la UI llama al montar el inicio para traer el nombre*:
  agrega una llamada de red evitable en el camino crítico del primer render (viola
  Principio VIII); se descarta a favor de exponerlo directamente en la sesión.

## 3. ¿Cómo se calcula el total de pacientes activos en el inicio?

**Decision**: Se reutiliza `buscarPacientes(repo, { estado: "ACTIVO" })` (ya existente,
contra `PacienteRepositoryDexie`) y se toma `.length` del resultado. No se agrega un
método `contar()` a `IPacienteRepository`.

**Rationale**: A la escala confirmada en `001-gestion-pacientes` (cientos a pocos miles de
fichas), traer la lista completa y contar en cliente no representa un costo perceptible,
y evita introducir un método de repositorio nuevo — con su propia implementación Prisma y
Dexie — para una necesidad que el método existente ya cubre (Principio V, YAGNI). Si el
volumen de pacientes creciera lo suficiente para que esto sea perceptible, un método
`contar()` dedicado queda como mejora futura, no como requisito de esta feature.

**Alternatives considered**:
- *Agregar `IPacienteRepository.contar(estado)` con implementaciones Prisma/Dexie*: más
  "correcto" en abstracto, pero especulativo dado el volumen real esperado — se descarta
  por ahora, documentado aquí para revisar si la escala cambia.

## 4. ¿Cómo se comparte la sidebar entre Inicio, Pacientes, Insumos y Configuración?

**Decision**: Se introduce un route group de Next.js, `src/app/(shell)/`, con un
`layout.tsx` propio que renderiza la sidebar y el saludo, y envuelve `page.tsx` (inicio),
`configuracion/page.tsx`, `insumos/page.tsx` y `pacientes/` (movido bajo el grupo). El
segmento `(shell)` no aparece en la URL — `/pacientes` sigue siendo `/pacientes`.

**Rationale**: Es el mecanismo estándar de Next.js App Router para compartir layout entre
varias rutas sin duplicar markup ni volver a montar la sidebar en cada `page.tsx`
(Principio VI: una sola fuente de la navegación, no una sidebar copiada y pegada en cuatro
archivos). `/login` queda fuera del grupo (no debe mostrar sidebar).

**Alternatives considered**:
- *Repetir el componente `Sidebar` importado individualmente en cada `page.tsx`*: funciona,
  pero cada pantalla decide por su cuenta si la incluye o no, lo que facilita que una
  futura pantalla la olvide o la implemente distinto — se descarta a favor del layout
  compartido, que la hace obligatoria por estructura.

## 5. ¿Qué pasa con la búsqueda del inicio y la ruta `/pacientes`?

**Decision**: El formulario de búsqueda del inicio navega a `/pacientes?q=<texto>`.
`PacientesPage` (ya existente) se modifica para inicializar su estado `q` desde el query
param `?q` en el primer render (si está presente), sin cambiar su lógica de búsqueda
existente (debounce, `buscarPacientes`, Dexie).

**Rationale**: Reutiliza al 100% la búsqueda ya construida y probada en
`001-gestion-pacientes` (FR-009 del spec exige esto explícitamente); evita reimplementar
resultados de búsqueda inline en el inicio.

**Alternatives considered**:
- *Mostrar resultados de búsqueda directamente en el inicio*: descartado ya en el spec
  (decisión tomada con el usuario antes de escribir `spec.md`), por duplicar lógica de
  búsqueda fuera de Pacientes.

## 6. ¿Qué necesita el middleware para proteger las rutas nuevas?

**Decision**: El `matcher` de `src/middleware.ts` se extiende para incluir `/`,
`/configuracion/:path*`, `/insumos/:path*` y `/api/account/:path*`, con el mismo
comportamiento ya implementado (sin token → redirect a `/login` para rutas de página,
`401 NO_AUTENTICADO` para rutas `/api/*`).

**Rationale**: Es la extensión directa del mecanismo existente (Principio IV: ninguna ruta
protegida sin verificación de sesión del lado del servidor); no se introduce un mecanismo
de autorización nuevo.

**Alternatives considered**: Ninguna — es la aplicación directa del patrón ya establecido
en `001-gestion-pacientes`, no hay una decisión de diseño real aquí.
