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
- [x] Role names are defined for system, study, company and employee actors.
- [x] Each protected resource has an owner path: study, company and/or employee.
- [x] Backend access context can represent all actor types.
- [x] Access creation chain is enforced: system admin creates studies, studies create companies, companies create employees.
- [x] Permission checks distinguish authenticated, unauthorized and not-found cases.
- [x] The implementation follows `docs/accesos-marca-y-tenancy.md`.

**Verification:**
- [x] `corepack pnpm typecheck`
- [x] Unit tests for access context and permission decisions.

**Dependencies:** Task 3

**Files likely touched:**
- `cierrabe/src/datos/schema.ts`
- `cierrabe/src/datos/contexto.ts`
- `cierrabe/src/permisos/*`
- `docs/accesos-marca-y-tenancy.md`

**Estimated scope:** Medium

## Task 5: Authentication Foundation
**Description:** Add mixed login foundation and resolve the authenticated user on every protected request.

**Acceptance criteria:**
- [x] Users can be represented independently from their roles.
- [x] Login foundation supports email/password credentials.
- [x] Login foundation supports magic link tokens.
- [x] The model leaves room for Google/Microsoft login later.
- [x] A user can belong to a study, company and/or employee profile if needed.
- [x] Session context includes user id, actor type, role and selected workspace.
- [x] Suspended users cannot access protected areas.
- [x] Auth errors do not leak internal details.

**Verification:**
- [x] `corepack pnpm typecheck`
- [x] Auth boundary tests for missing session, suspended user and valid session.

**Notes:**
- [ ] Pending later: real route handlers, email delivery, cookies and login UI.

**Dependencies:** Task 4

**Files likely touched:**
- `cierrabe/src/auth/*`
- `cierrabe/src/datos/schema.ts`
- `cierrafe/src/app/*`

**Estimated scope:** Medium

## Task 6: Backend Authorization Guards
**Description:** Enforce permissions in backend code so frontend routes and hidden buttons are never the security boundary.

**Acceptance criteria:**
- [x] System admin can access global resources.
- [x] Study users can access only their study's companies and employees.
- [x] Company users can access only their own company.
- [x] Employees can access only their own profile and receipts.
- [x] Cross-tenant reads and writes fail with safe `403` or `404` behavior.
- [x] Sensitive writes have a protected audit action available.

**Verification:**
- [x] Permission tests for each actor.
- [x] Negative tests for URL/id tampering.
- [x] `corepack pnpm typecheck`

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
- [x] Study profile supports visible name, legal name, RUT, contact data and logo/photo.
- [x] Company profile supports visible name, legal name, RUT, contact data and logo.
- [x] Only authorized actors can edit each profile.
- [x] Logo upload validates file type and size.
- [x] UI falls back to initials when no logo exists.
- [x] Profile and logo changes are audited.
- [x] Payroll receipt templates can consume company visible name and logo when available.

**Verification:**
- [x] Backend validation tests for profile updates.
- [x] Permission tests for forbidden profile edits.
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
- [x] User preference supports `light`, `dark` and `system`.
- [x] Preference is stored per user.
- [x] Login screen defaults to system preference.
- [x] Authenticated screens apply the saved preference.
- [x] Theme tokens preserve contrast in both modes.
- [x] Logos remain readable on both backgrounds.

**Verification:**
- [x] Unit test for preference mapping.
- [ ] Manual visual check on study, company and employee screens.
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Dependencies:** Task 6

**Files likely touched:**
- `cierrabe/src/datos/schema.ts`
- `cierrafe/src/app/globals.css`
- `cierrafe/src/components/shell.tsx`
- `cierrafe/src/lib/*`

**Estimated scope:** Medium

## Task 9: Module Catalog Contracts
**Description:** Define the functional module catalog used to enable or disable system capabilities by study.

**Acceptance criteria:**
- [x] Module codes are stable and documented.
- [x] Initial module catalog covers the Excel replacement scope: RRHH core, payroll core, receipts, BPS, IRPF, licenses, salary history and accounting entries.
- [x] Modules have name, description, status, scope and dependencies.
- [x] Backend can list active modules.
- [x] Optional features reference module codes instead of hardcoded booleans.
- [x] The implementation follows `docs/modulos-paquetes-y-facturacion.md`.

**Verification:**
- [x] `corepack pnpm typecheck`
- [x] Unit tests for module dependency and active/inactive status.

**Dependencies:** Task 6

**Files likely touched:**
- `cierrabe/src/modulos/*`
- `cierrabe/src/datos/schema.ts`
- `cierrabe/src/datos/contratos.ts`
- `docs/modulos-paquetes-y-facturacion.md`

**Estimated scope:** Medium

## Task 10: Plans, Add-ons and Study Subscriptions
**Description:** Model commercial packages and what each study has contracted.

**Acceptance criteria:**
- [x] Plans can include multiple modules.
- [x] Pricing model supports fixed monthly price by plan.
- [x] Pricing model supports fixed monthly price by module/add-on.
- [x] Study subscription stores plan, status, dates, currency and internal notes.
- [x] Add-ons can enable modules outside the plan.
- [x] Admin overrides can enable or disable a module manually.
- [x] Commercial changes are audited.

**Verification:**
- [x] Repository/schema tests for plan and subscription relationships.
- [x] Permission tests proving only system admins can change commercial setup.
- [x] `corepack pnpm typecheck`

**Dependencies:** Task 9

**Files likely touched:**
- `cierrabe/src/modulos/*`
- `cierrabe/src/facturacion/*`
- `cierrabe/src/datos/schema.ts`
- `cierrabe/drizzle/*`

**Estimated scope:** Medium

## Task 11: Contracted Module Guard
**Description:** Enforce module availability in backend code before executing optional system functions.

**Acceptance criteria:**
- [ ] Backend exposes a single guard to check if a study has a module enabled.
- [ ] Guard combines plan modules, add-ons, overrides and subscription status.
- [ ] Disabled modules cannot be executed through direct requests.
- [ ] Frontend receives a clear non-technical reason when a module is not included.
- [ ] Permission checks and module checks remain separate.

**Verification:**
- [ ] Tests for included module, disabled module, add-on, override and paused subscription.
- [ ] Negative test for URL/request bypass.
- [ ] `corepack pnpm typecheck`

**Dependencies:** Task 10

**Files likely touched:**
- `cierrabe/src/modulos/*`
- `cierrabe/src/permisos/*`
- `cierrabe/src/datos/errores.ts`
- `cierrafe/src/components/*`

**Estimated scope:** Medium

## Task 12: Admin Commercial Console
**Description:** Create the admin-facing screens needed to manage modules, plans and contracted services per study.

**Acceptance criteria:**
- [ ] Admin can view all studies and their current plan.
- [ ] Admin can see active modules and add-ons for each study.
- [ ] Admin can assign a package to a study.
- [ ] Admin can define package/modules and fixed monthly price when giving access to a new study.
- [ ] Admin can activate/deactivate add-ons and overrides.
- [ ] Admin can enter internal commercial notes.
- [ ] All changes create audit events.

**Verification:**
- [ ] UI smoke test for admin commercial console.
- [ ] Permission test proving study users cannot access admin commercial actions.
- [ ] `corepack pnpm lint`
- [ ] `corepack pnpm build`

**Dependencies:** Task 11

**Files likely touched:**
- `cierrafe/src/app/admin/*`
- `cierrafe/src/components/*`
- `cierrabe/src/modulos/*`
- `cierrabe/src/facturacion/*`

**Estimated scope:** Medium

## Task 13: Internal Billing Summary
**Description:** Track commercial setup and produce a monthly internal summary of what each study should be charged.

**Acceptance criteria:**
- [ ] Usage events can be recorded for internal reference.
- [ ] Billing summary includes fixed plan price, fixed module/add-on prices and manual adjustments.
- [ ] Summary can be filtered by month and study.
- [ ] Prices are versioned or snapshotted so historical totals do not change silently.
- [ ] Admin can see notes explaining manual adjustments.

**Verification:**
- [ ] Unit tests for billing summary calculation.
- [ ] Tests for historical price snapshot behavior.
- [ ] `corepack pnpm typecheck`

**Dependencies:** Task 12

**Files likely touched:**
- `cierrabe/src/facturacion/*`
- `cierrabe/src/datos/schema.ts`
- `cierrafe/src/app/admin/*`

**Estimated scope:** Medium
