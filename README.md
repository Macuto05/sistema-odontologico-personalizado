# Sistema Odontológico

Sistema de gestión de pacientes para un odontólogo — de un solo usuario, offline-first
(funciona sin conexión y sincroniza al reconectar). Ver `.specify/memory/constitution.md`
para los principios del proyecto y `specs/001-gestion-pacientes/` para el spec, plan y
tareas de la primera feature (gestión de pacientes).

## Stack

TypeScript, Next.js (App Router), PostgreSQL vía Prisma, IndexedDB vía Dexie.js
(local-first), Auth.js (cuenta única), Zod, Vitest + Playwright, Service Worker
(`@ducanh2912/next-pwa`) para que la app cargue sin internet.

## Requisitos previos

- Node.js 20+
- Una base de datos PostgreSQL accesible (local para desarrollo; una alojada en la nube,
  ej. Neon o Supabase, para el despliegue real — ver `constitution.md` §Technology &
  Architecture Constraints sobre por qué)

## Puesta en marcha (desarrollo)

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar los valores reales (nunca commitear `.env`):

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: connection string de tu PostgreSQL.
   - `AUTH_SECRET`: cualquier string largo y aleatorio (ej.
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - `SEED_ODONTOLOGO_EMAIL` / `SEED_ODONTOLOGO_PASSWORD`: la cuenta con la que vas a
     iniciar sesión.

3. Generar el cliente de Prisma y aplicar las migraciones:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Sembrar la cuenta única del odontólogo (sin esto no hay con qué iniciar sesión):

   ```bash
   npm run prisma:seed
   ```

5. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir `http://localhost:3000` — redirige a `/login`.

**Nota**: el Service Worker (lo que permite que la app cargue sin internet) está
deshabilitado en desarrollo a propósito — interfiere con el hot-reload de Next.js. Para
probar el comportamiento offline de verdad, usar un build de producción (ver abajo).

## Build de producción / prueba del comportamiento offline

```bash
npm run build
npm run start
```

Con la app abierta una vez online, cortar la conexión (modo avión, o DevTools → Network →
Offline) y seguir usándola: crear/editar/archivar pacientes sigue funcionando, porque la UI
lee y escribe siempre contra una base local (IndexedDB) primero. Al reconectar, los
cambios se sincronizan solos con el servidor en segundo plano.

## Tests

```bash
npm test              # Unitarios + integración (Vitest)
npm run test:e2e       # End-to-end (Playwright) — requiere DB real y la app corriendo/
                        # buildeada; ver playwright.config.ts (usa build de producción)
```

Para los tests e2e, las variables `E2E_ODONTOLOGO_EMAIL` / `E2E_ODONTOLOGO_PASSWORD` deben
coincidir con las usadas al sembrar la cuenta (`SEED_ODONTOLOGO_EMAIL`/`_PASSWORD`).

## Estructura del proyecto

Arquitectura en capas (Principio II de la constitución) dentro de `src/`:

```
src/
├── domain/          # Entidades y reglas de negocio, sin dependencias de framework
├── application/     # Casos de uso — orquestan el dominio
├── infrastructure/  # Prisma (servidor), Dexie (cliente), sync, auth
└── app/             # Next.js — UI y rutas de API
```

Ver `specs/001-gestion-pacientes/plan.md` para el detalle completo de la estructura y las
decisiones de arquitectura (`research.md`), y `docs/design-system.md` para los tokens de
diseño (colores, tipografía, espaciado) que toda la UI debe usar.
