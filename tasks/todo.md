# MVP Real Todo

## Task 1: Data Contracts and Tenant Context
**Description:** Define the stable internal interface between UI/workflows and persistence, without adding a database dependency yet.

**Acceptance criteria:**
- [x] There is a `cierrabe/src/datos/` boundary with tenant context, branded IDs and structured domain errors.
- [x] Repositories for estudios, empresas, empleados, periodos, novedades and auditoria are declared as contracts.
- [x] No UI imports SQL or future persistence internals.

**Verification:**
- [ ] `corepack pnpm lint`
- [ ] `corepack pnpm build`

**Dependencies:** None

**Files likely touched:**
- `src/datos/contratos.ts`
- `src/datos/errores.ts`
- `src/datos/contexto.ts`

**Estimated scope:** Small

## Task 2: Test and Typecheck Tooling
**Description:** Add scripts and the first automated tests so future backend work has a safety net.

**Acceptance criteria:**
- [x] `typecheck` script runs `tsc --noEmit`.
- [x] Test runner is installed and configured.
- [x] At least one motor/format test exists and passes.

**Verification:**
- [ ] `corepack pnpm typecheck`
- [ ] `corepack pnpm test`
- [ ] `corepack pnpm build`

**Dependencies:** Task 1

**Estimated scope:** Medium

## Task 3: PostgreSQL Schema Foundation
**Description:** Introduce real persistence with initial tables for studies, users/memberships, companies, employees and audit.

**Acceptance criteria:**
- [x] Drizzle/Postgres dependencies and config exist.
- [x] Initial schema includes `estudio_id` on business tables.
- [x] Migration can be generated locally.
- [ ] Migration can be applied locally. Blocked here because Docker/PostgreSQL is not installed or not in PATH.

**Verification:**
- [x] Migration generation command succeeds.
- [ ] Migration apply command succeeds when PostgreSQL is available.
- [ ] Repository tests can connect to test DB.
- [ ] `corepack pnpm build`

**Dependencies:** Task 2

**Estimated scope:** Medium
