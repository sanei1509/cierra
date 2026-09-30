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

## Task 4: Access Model and Role Contracts
**Description:** Define the product and code contracts for system admins, studies, companies and employees before wiring authentication.

**Acceptance criteria:**
- [ ] Role names are defined for system, study, company and employee actors.
- [ ] Each protected resource has an owner path: study, company and/or employee.
- [ ] Backend access context can represent all actor types.
- [ ] Permission checks distinguish authenticated, unauthorized and not-found cases.
- [ ] The implementation follows `docs/accesos-marca-y-tenancy.md`.

**Verification:**
- [ ] `corepack pnpm typecheck`
- [ ] Unit tests for access context and permission decisions.

**Dependencies:** Task 3

**Files likely touched:**
- `cierrabe/src/datos/schema.ts`
- `cierrabe/src/datos/contexto.ts`
- `cierrabe/src/permisos/*`
- `docs/accesos-marca-y-tenancy.md`

**Estimated scope:** Medium

## Task 5: Authentication Foundation
**Description:** Add real login foundation and resolve the authenticated user on every protected request.

**Acceptance criteria:**
- [ ] Users can be represented independently from their roles.
- [ ] A user can belong to a study, company and/or employee profile if needed.
- [ ] Session context includes user id, actor type, role and selected workspace.
- [ ] Suspended users cannot access protected areas.
- [ ] Auth errors do not leak internal details.

**Verification:**
- [ ] `corepack pnpm typecheck`
- [ ] Auth boundary tests for missing session, suspended user and valid session.

**Dependencies:** Task 4

**Files likely touched:**
- `cierrabe/src/auth/*`
- `cierrabe/src/datos/schema.ts`
- `cierrafe/src/app/*`

**Estimated scope:** Medium

## Task 6: Backend Authorization Guards
**Description:** Enforce permissions in backend code so frontend routes and hidden buttons are never the security boundary.

**Acceptance criteria:**
- [ ] System admin can access global resources.
- [ ] Study users can access only their study's companies and employees.
- [ ] Company users can access only their own company.
- [ ] Employees can access only their own profile and receipts.
- [ ] Cross-tenant reads and writes fail with safe `403` or `404` behavior.
- [ ] Sensitive writes create audit events.

**Verification:**
- [ ] Permission tests for each actor.
- [ ] Negative tests for URL/id tampering.
- [ ] `corepack pnpm typecheck`

**Dependencies:** Task 5

**Files likely touched:**
- `cierrabe/src/permisos/*`
- `cierrabe/src/datos/contratos.ts`
- `cierrabe/src/datos/contexto.ts`
- `cierrabe/src/datos/errores.ts`

**Estimated scope:** Medium

## Task 7: Profile, Logo and Brand Settings
**Description:** Let studies and companies manage their visible identity safely.

**Acceptance criteria:**
- [ ] Study profile supports visible name, legal name, RUT, contact data and logo/photo.
- [ ] Company profile supports visible name, legal name, RUT, contact data and logo.
- [ ] Only authorized actors can edit each profile.
- [ ] Logo upload validates file type and size.
- [ ] UI falls back to initials when no logo exists.
- [ ] Profile and logo changes are audited.

**Verification:**
- [ ] Backend validation tests for profile updates.
- [ ] Permission tests for forbidden profile edits.
- [ ] Manual UI check in light and dark mode.

**Dependencies:** Task 6

**Files likely touched:**
- `cierrabe/src/datos/schema.ts`
- `cierrabe/src/permisos/*`
- `cierrafe/src/components/*`
- `cierrafe/src/app/(estudio)/configuracion/page.tsx`

**Estimated scope:** Medium

## Task 8: User Theme Preference
**Description:** Add per-user appearance preference for light mode, dark mode or system mode.

**Acceptance criteria:**
- [ ] User preference supports `light`, `dark` and `system`.
- [ ] Preference is stored per user.
- [ ] Login screen defaults to system preference.
- [ ] Authenticated screens apply the saved preference.
- [ ] Theme tokens preserve contrast in both modes.
- [ ] Logos remain readable on both backgrounds.

**Verification:**
- [ ] Unit test for preference mapping.
- [ ] Manual visual check on study, company and employee screens.
- [ ] `corepack pnpm lint`
- [ ] `corepack pnpm build`

**Dependencies:** Task 6

**Files likely touched:**
- `cierrabe/src/datos/schema.ts`
- `cierrafe/src/app/globals.css`
- `cierrafe/src/components/shell.tsx`
- `cierrafe/src/lib/*`

**Estimated scope:** Medium
