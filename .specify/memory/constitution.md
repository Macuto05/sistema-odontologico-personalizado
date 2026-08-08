<!--
Sync Impact Report
==================
Version change: 1.4.1 → 1.5.0
Modified principles: none
Added sections:
  - Technology & Architecture Constraints: Postgres hosting moves to Supabase (Prisma stays
    the only relational data-access layer; Supabase client/APIs unused for the database).
    Added Supabase Storage as the binary-content store for `ArchivoPaciente`/
    `ArchivoEstudio`, replacing the in-Postgres `Bytes` columns — the exact migration
    research.md #4 of `005-atencion-paciente` anticipated ("the `Bytes` column can be
    replaced by a URL without changing the contract with the rest of the system"). Clarified
    that Auth.js remains the auth layer; Supabase Auth is not adopted.
Removed sections: none
Deferred items: spec 012 (archivos-paciente storage migration) will fill in the concrete
  contract/data-model changes; this amendment only ratifies the technology choice.
Templates requiring follow-up: none checked in this run (constitution-only command;
  dependent templates read this file at runtime and are not modified here).

Version history (condensed):
  1.5.0 — Postgres hosting moved to Supabase; Supabase Storage adopted for
    ArchivoPaciente/ArchivoEstudio binary content.
  1.4.1 — Documented the Service Worker / app-shell caching layer discovered during
    implementation of 001-gestion-pacientes.
  1.4.0 — Ratified the technology stack (closes TODO(TECH_STACK)).
  1.3.0 — Added Principle VII (Security & Vulnerability Prevention) and Principle VIII
    (Performance & Efficient Data Access); scalability principle explicitly declined.
  1.2.0 — Principle VI expanded to require full responsive design.
  1.1.2 — Technology & Architecture Constraints no longer pins docs/design-system.md's
    version number, to avoid re-syncing both files on every edit.
  1.1.1 — docs/design-system.md authored and ratified (was previously a TODO).
  1.1.0 — Added Principle VI (UI Consistency & Design System Discipline).
  1.0.0 — Initial ratification: Principles I–V, Technology & Architecture Constraints,
    Development Workflow & Quality Gates, Governance.
-->

# Sistema Odontológico Constitution
<!-- Dental clinic management system: patients, appointments, treatments, and billing. -->

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Every feature MUST have failing tests written and reviewed before implementation code is
written. The Red-Green-Refactor cycle is mandatory: write the test, watch it fail for the
right reason, implement the minimum code to pass, then refactor. No pull request may merge
with implementation code that lacks a corresponding test committed earlier in its history.
**Rationale**: In a clinical records system, unverified behavior around appointments,
treatments, and billing directly risks patient safety and financial correctness. Test-first
is the cheapest guarantee that behavior matches intent before it reaches real patient data.

### II. Layered Architecture
The codebase MUST maintain clear separation between business rules, use cases, external
integrations, and presentation. Dependencies MUST only flow inward — outer layers (UI,
frameworks, databases) may depend on inner layers (domain rules), never the reverse. Domain
logic MUST remain free of framework-specific imports so it can be tested and reasoned about
in isolation. The specific layer names and folder structure are established when the
technology stack is ratified (see Technology & Architecture Constraints) but the inward-only
dependency rule itself is non-negotiable regardless of stack.
**Rationale**: Clinical systems accumulate regulatory, billing, and scheduling rules that
outlive any particular framework or database choice. Isolating those rules from
infrastructure prevents a framework upgrade or database migration from becoming a rewrite.

### III. Data Integrity & Auditability
Every write to patient, appointment, treatment, or billing records MUST be attributable to
an authenticated actor and MUST NOT silently discard prior state — corrections are recorded
as new entries, not overwrites, wherever the record has clinical or financial significance.
Validation of clinical and billing data MUST happen at the domain/use-case boundary, not
only in the UI. Migrations to the data schema MUST be reversible or paired with a documented
manual rollback plan before they are applied outside a local environment.
**Rationale**: Dental records are both medical and legal documents; the system must be able
to answer "who changed what, and when" and must never let a UI-only validation gap corrupt
a patient's clinical history or invoice.

### IV. Role-Based Access Control
Access to patient data, clinical actions, and billing operations MUST be gated by an
explicit role check enforced on the server side (API/use-case layer), never by client-side
UI hiding alone. Each role (e.g., patient, dentist/doctor, admin, reception, lab, inventory)
MUST be granted only the permissions its function requires; new endpoints or use cases MUST
declare which roles may invoke them before merge. Authentication state MUST be verified on
every request that touches protected data — there is no implicit trust between requests.
**Rationale**: A multi-role clinical system is a high-value target for both accidental data
exposure and deliberate misuse; enforcing authorization at the boundary closest to the data
is the only check that cannot be bypassed by a modified client.

### V. Simplicity & YAGNI
Implementations MUST start with the simplest design that satisfies the current, specified
requirement. Abstractions, configuration options, and extensibility hooks MUST NOT be added
speculatively for hypothetical future features. When three or fewer call sites share similar
logic, duplication is preferred over introducing a shared abstraction until a fourth,
concrete use case justifies it. Every added layer of indirection MUST be traceable to a
requirement in the current spec, not a guess about future needs.
**Rationale**: Speculative abstraction is a common source of complexity in long-running
clinical software; keeping the design minimal keeps it auditable and keeps onboarding cost
low for a small team.

### VI. UI Consistency, Responsive Design & Design System Discipline (NON-NEGOTIABLE)
All UI MUST draw its colors, typography, and spacing from a single, canonical design-system
source (`docs/design-system.md` and its associated tokens) — never hardcoded or invented
per-component or per-feature. No feature may introduce its own palette, font size, or
spacing value. Before building a new UI primitive (button, input, modal, card, badge, etc.),
the codebase MUST be checked for an existing reusable component; near-duplicate components
that differ only in ad-hoc styling MUST NOT be created. Spacing MUST follow the single fixed
scale defined in the design system (e.g., a 4px/8px base unit) — no per-screen eyeballed
padding or margin. Typography MUST use only the closed set of type styles the design system
defines (e.g., heading, subheading, body, caption) — no per-screen invented font sizes or
weights. Color usage MUST be limited to the design system's semantic palette (primary,
secondary, neutrals, and state colors for success/error/warning); adding a new color requires
updating the design system first, never adding it ad-hoc inside a component. All interactive
UI MUST meet a minimum color-contrast ratio and a minimum touch-target size suitable for
tablet use at chairside.

Every screen MUST be fully responsive across the full range of devices this system is used
on — phone, tablet, and desktop/laptop — not just the tablet used chairside. No screen may
rely on a single fixed viewport width, require horizontal scrolling for its primary content,
or ship a layout validated on only one breakpoint. Responsive behavior is checked at every
review, the same as any other principle in this document, not treated as a later polish
pass.

The constitution does not enumerate the concrete token values, breakpoints, scale, palette,
or component inventory — those live in `docs/design-system.md`, which is the single source
of truth consulted (and maintained, via the `design-system` skill) before any UI screen is
implemented.
**Rationale**: Features built one at a time — often with AI assistance across separate
sessions — tend to each invent their own spacing, type sizes, and colors, producing an
interface that looks like it was assembled by five different people. A single token source
and a reuse-before-create rule are what keep a growing feature set looking like one product.
Responsiveness is elevated to NON-NEGOTIABLE because this system is explicitly used across
phone, tablet, and desktop — a screen that only works on one of them is an incomplete
feature, not a finishing touch to add later.

### VII. Security & Vulnerability Prevention (NON-NEGOTIABLE)
All data access MUST use parameterized queries or an ORM/query builder that parameterizes
automatically — string-concatenated or interpolated SQL MUST NOT be used, to prevent SQL
injection. All user-supplied content rendered in the UI MUST be output-encoded/escaped by
default (the framework's default escaping); raw/unescaped HTML built from user input MUST
NOT be rendered, to prevent XSS. Every data-access operation MUST verify that the specific
record belongs to, or is accessible by, the authenticated actor — not only that the actor's
role permits the action in general. A role check that passes on the wrong patient's record
is still a bug: this extends Principle IV's role check to the level of the individual
record, and is what prevents IDOR (broken object-level access control). Authentication MUST
use industry-standard password hashing (e.g., bcrypt or argon2) and secure session/token
handling (httpOnly, secure cookies or equivalent) — passwords and tokens MUST NOT be stored
or transmitted in plaintext. Secrets (API keys, database credentials, signing keys) MUST NOT
be committed to the repository; they are read from environment configuration. Dependencies
MUST be checked for known vulnerabilities before merge and updated when a fix is available.
**Rationale**: A clinical system holds legally sensitive patient data (Principle III). A SQL
injection, XSS, or IDOR bug can expose an entire patient database at once — far beyond what
a single role-check bug would — and mishandled passwords or secrets are the most common
real-world entry point for a breach.

### VIII. Performance & Efficient Data Access
Data-loading code MUST avoid N+1 query patterns — a screen that needs a list plus a related
field MUST fetch that relation in the same query (eager-load) rather than issuing one query
per row. Conversely, a screen MUST NOT eagerly load data it does not display (e.g., a
patient list MUST NOT preload full treatment history it never renders on that screen). The
UI MUST NOT issue redundant or avoidable network/API calls — repeated requests triggered by
the same user interaction MUST be debounced or cached (e.g., a search box debounces
keystrokes instead of firing one request per character). Any operation that takes longer
than the user notices instantly MUST show a visible loading state rather than leaving the
interface silent.
**Rationale**: The odontólogo uses this system between patients, often on a tablet; a slow
list or a screen waiting on avoidable calls costs real time in a clinical setting — this
matters even with a single user, independent of any future concurrency concern.

## Technology & Architecture Constraints

**Ratified stack** (2026-07-30) — this is the first architectural decision required by
Governance, made explicitly with the user rather than assumed:

- **Language & framework**: TypeScript, Next.js (App Router) for both the UI and the API
  routes (single codebase, satisfies Principle VI's responsive/PWA requirement).
- **Local-first data layer**: the client is offline-first, not "online with an offline
  fallback." All UI reads and writes go through IndexedDB (via Dexie.js) first, on every
  device (phone, tablet, desktop) and regardless of connectivity — the UI never blocks on
  the network for a read or a write.
- **Sync**: a custom outbox pattern. Every local mutation is written to IndexedDB and
  simultaneously queued as a pending sync operation; a background process replays the
  queue against the server API in batches once connectivity is available. No third-party
  sync engine (RxDB, ElectricSQL, PowerSync, etc.) — proportional to one user syncing their
  own devices, not real-time multi-user collaboration (Principle V, YAGNI). Conflicting
  edits to the same record made offline on two devices are never silently dropped: both are
  preserved as separate entries per Principle III, with the user prompted to reconcile —
  this is expected to be rare, not designed around as a common case.
- **Server database**: PostgreSQL, hosted on Supabase, accessed exclusively through Prisma
  ORM — Prisma's parameterized queries are how Principle VII's SQL-injection requirement is
  met by construction, not by manual escaping. Supabase is used here strictly as managed
  Postgres hosting: Prisma remains the only data-access layer, and Supabase's own client
  libraries/APIs are not used for reads or writes to this database (see Storage below for
  the one exception).
- **File storage**: Supabase Storage holds the binary content for `ArchivoPaciente` and
  `ArchivoEstudio` (research.md #4 of `005-atencion-paciente` anticipated this exact move —
  "the `Bytes` column can be replaced by a URL without changing the contract with the rest
  of the system"). Accessed only from server-side code via the Supabase service-role key;
  the anon key/client SDK is not used in the browser. This is the one deliberate exception
  to "Prisma is the only data-access layer" above — object storage is not a relational
  concern Prisma models.
- **Authentication**: Auth.js (NextAuth), configured for this project's single account
  (the odontólogo) rather than multi-tenant/multi-provider use. Passwords hashed with
  bcrypt or argon2; sessions via secure httpOnly cookies, per Principle VII. Supabase Auth is
  not used — authentication stays on Auth.js regardless of where Postgres/Storage are hosted.
- **App-shell offline caching**: a Service Worker (via `@ducanh2912/next-pwa`, a
  Workbox-based library — not hand-rolled, unlike the sync layer above) caches the
  application shell so it can load with zero connectivity, not just read/write data
  offline. Discovered as a missing half of the offline requirement during implementation:
  the local-first data layer alone does not help if the browser cannot even load the page
  without a network request. The Service Worker is intentionally disabled in development
  (standard practice, avoids conflicting with hot-reload) and is only active — and only
  testable — against a production build (`next build && next start`).

Whatever this stack's concrete layer boundaries look like inside Next.js, they MUST satisfy
Principle II (layered architecture with inward-only dependencies), Principle IV
(server-enforced auth/role checks on every protected route), Principle VI (fully responsive
UI across phone, tablet, and desktop), Principle VII (parameterized queries, output
escaping, secure auth) and Principle VIII (efficient, non-N+1 data access — Prisma queries
MUST use explicit `select`/`include` rather than fetching whole relations by default).

`docs/design-system.md` is ratified and covers the tokens, spacing scale, typographic
hierarchy, color palette, component inventory, and accessibility minimums needed for the
`001-gestion-pacientes` feature, per Principle VI. It MUST be extended — not bypassed —
before any feature introduces a component or token category it doesn't yet cover. Its own
version history is tracked inside that file, not mirrored here.

## Development Workflow & Quality Gates

All changes MUST go through review before merging to the main branch; a reviewer MUST verify
compliance with the Core Principles above, not only functional correctness. Automated tests
MUST pass before merge; a merge that requires disabling or skipping a test to pass MUST NOT
proceed until the underlying failure is understood and resolved. Any deviation from a Core
Principle MUST be documented in the pull request description with an explicit justification;
undocumented deviations are grounds for review rejection.

## Governance

This constitution supersedes any conflicting practice, template default, or ad-hoc
convention adopted elsewhere in the project. Amendments follow this procedure:

1. Propose the change (new principle, removal, or rewording) with a stated rationale.
2. Classify the change as MAJOR (backward-incompatible principle removal/redefinition),
   MINOR (new principle or materially expanded guidance), or PATCH (clarification, wording,
   typo fix with no semantic change), per semantic versioning.
3. Update this file, bump the version accordingly, update `Last Amended`, and record the
   change in a Sync Impact Report comment at the top of this file.
4. Review dependent templates and commands (plan, spec, tasks, checklist templates) for
   references that the amendment invalidates, and flag them for follow-up even though this
   command does not edit them directly.

All pull requests and reviews MUST verify compliance with this constitution. Complexity
that violates Principle V MUST be justified in writing in the PR description or removed.
Runtime development guidance for AI agents and contributors (command-specific instructions,
stack-specific conventions once ratified) belongs in per-project agent guidance files (e.g.,
`CLAUDE.md`), which MUST NOT contradict this constitution.

**Version**: 1.5.0 | **Ratified**: 2026-07-30 | **Last Amended**: 2026-08-07
