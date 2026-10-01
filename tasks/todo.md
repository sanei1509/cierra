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
- [x] Backend exposes a single guard to check if a study has a module enabled.
- [x] Guard combines plan modules, add-ons, overrides and subscription status.
- [x] Disabled modules cannot be executed through direct requests.
- [x] Frontend receives a clear non-technical reason when a module is not included.
- [x] Permission checks and module checks remain separate.

**Verification:**
- [x] Tests for included module, disabled module, add-on, override and paused subscription.
- [x] Negative test for URL/request bypass.
- [x] `corepack pnpm typecheck`

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
- [x] Admin can view all studies and their current plan.
- [x] Admin can see active modules and add-ons for each study.
- [x] Admin can assign a package to a study.
- [x] Admin can define package/modules and fixed monthly price when giving access to a new study.
- [x] Admin can activate/deactivate add-ons and overrides.
- [x] Admin can enter internal commercial notes.
- [x] All changes create audit events.

**Verification:**
- [x] UI smoke test for admin commercial console.
- [x] Permission test proving study users cannot access admin commercial actions.
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [x] Backend commercial repositories exist for plans and study subscriptions.
- [x] Admin console save action is wired to a real Next Server Action with backend repositories and audit.
- [ ] Pending later: replace development admin context with the real authenticated session.

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
- [x] Usage events can be recorded for internal reference.
- [x] Billing summary includes fixed plan price, fixed module/add-on prices and manual adjustments.
- [x] Summary can be filtered by month and study.
- [x] Prices are versioned or snapshotted so historical totals do not change silently.
- [x] Admin can see notes explaining manual adjustments in the UI.

**Verification:**
- [x] Unit tests for billing summary calculation.
- [x] Tests for historical price snapshot behavior.
- [x] `corepack pnpm typecheck`

**Notes:**
- [x] Backend billing calculation, usage events, billing snapshots and admin generation action exist.
- [x] Admin console renders billing summary lines, usage references and manual adjustment notes.

**Dependencies:** Task 12

**Files likely touched:**
- `cierrabe/src/facturacion/*`
- `cierrabe/src/datos/schema.ts`
- `cierrafe/src/app/admin/*`

**Estimated scope:** Medium

## Task 14: Internal Collections and Study Payments
**Description:** Track whether studies paid their monthly summaries, support partial payments and register prepaid months so paid periods do not keep appearing as debt.

**Acceptance criteria:**
- [x] Admin can register a payment for a study.
- [x] Payments can be applied to one month or spread across multiple prepaid months.
- [x] Monthly collection state distinguishes pending, partial, paid and credit balance.
- [x] Backend stores payments and payment applications separately from billing summaries.
- [x] Admin console can mark the current month as paid and register prepaid months.

**Verification:**
- [x] Unit tests for pending, partial, paid and credit balance states.
- [x] Unit tests for spreading an annual/prepaid payment across months.
- [x] `corepack pnpm typecheck`

**Dependencies:** Task 13

**Files likely touched:**
- `cierrabe/src/facturacion/*`
- `cierrabe/src/datos/schema.ts`
- `cierrabe/src/datos/repos/*`
- `cierrafe/src/app/admin/*`

**Estimated scope:** Medium

## Task 15: Login UI and Development Session Bridge
**Description:** Add the shared login entry point for all roles and keep fast role access for development while real authentication is wired.

**Acceptance criteria:**
- [x] There is a `/login` screen for the mixed login flow.
- [x] Login copy explains that every email must already be registered by a higher-level actor.
- [x] The screen includes email/password fields for all roles.
- [x] Google login is represented as a future option, without bypassing database validation.
- [x] Development buttons exist for system admin, study admin, payroll operator, read-only study user, company and employee.
- [x] Development access stores a server-side httpOnly cookie placeholder that can be replaced by real session resolution later.
- [x] Existing role switcher inside the study shell still works for local testing.

**Verification:**
- [x] Unit tests for development access mapping.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Dependencies:** Task 5, Task 12

**Files likely touched:**
- `cierrafe/src/app/login/*`
- `cierrafe/src/lib/dev-session.ts`
- `cierrafe/src/components/shell.tsx`

**Estimated scope:** Small

## Task 16: Admin Delegated Study Operation
**Description:** Let system admins operate as a study for direct Cierra service or delegated support, while preserving audit identity.

**Acceptance criteria:**
- [x] Access context can represent a study session delegated by a system admin.
- [x] Delegated study access preserves admin user, admin role, reason and start date.
- [x] A delegated admin has the same operational permissions as a study admin for the target study.
- [x] Support/delegation without system admin permission is rejected.
- [x] Admin UI has an explicit "Funcionar como estudio contable" access.
- [x] Login development shortcuts include admin-as-study access.
- [x] Product docs describe direct service and delegated support behavior.

**Verification:**
- [x] Unit tests for delegated access permissions.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Dependencies:** Task 15

**Files likely touched:**
- `cierrabe/src/datos/contexto.ts`
- `cierrabe/src/permisos/*`
- `cierrafe/src/app/admin/*`
- `cierrafe/src/lib/dev-session.ts`
- `docs/accesos-marca-y-tenancy.md`

**Estimated scope:** Small

## Task 17: Development Route Protection
**Description:** Use the development session cookie as the first frontend guard so protected areas no longer open without a selected actor.

**Acceptance criteria:**
- [x] Study dashboard routes require a study actor session.
- [x] Admin routes require a system actor session.
- [x] Company portal routes require company or delegated study access.
- [x] Employee portal and receipt routes require an appropriate authenticated actor.
- [x] Invalid or tampered development session cookies are rejected.
- [x] Route guard is isolated so it can be replaced by real auth session resolution later.

**Verification:**
- [x] Unit tests for development session parsing.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Dependencies:** Task 15, Task 16

**Files likely touched:**
- `cierrafe/src/lib/dev-auth.ts`
- `cierrafe/src/lib/dev-session.ts`
- `cierrafe/src/app/*/layout.tsx`

**Estimated scope:** Small

## Task 18: Initial Access Provisioning Contracts
**Description:** Define backend actions for creating each next-level actor with its initial login access, following the responsibility chain.

**Acceptance criteria:**
- [x] System admin can create a study with an invited `studio_owner`.
- [x] Study admin or delegated admin can create a company with an invited `company_owner`.
- [x] Company owner, study admin or delegated admin can create an employee with an invited `employee_self`.
- [x] Inputs validate required names and emails before creating access.
- [x] Employee creation rejects mismatched company ownership.
- [x] Forbidden responsibility-chain jumps are rejected.
- [x] Each provisioning action records an audit event.

**Verification:**
- [x] Unit tests for study, company and employee provisioning.
- [x] Unit tests for invalid email, mismatched company and forbidden actors.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending next: wire these provisioning actions to real repositories/routes and frontend forms.

**Dependencies:** Task 16, Task 17

**Files likely touched:**
- `cierrabe/src/acciones/altas.ts`
- `cierrabe/src/datos/contratos.ts`
- `cierrabe/tests/altas.test.ts`

**Estimated scope:** Medium

## Task 19: Demo Provisioning Forms
**Description:** Add usable frontend entry points for creating companies and employees in the demo flow, matching the access-provisioning chain.

**Acceptance criteria:**
- [x] Study dashboard has an enabled "Nueva empresa" flow.
- [x] Creating a company captures responsible person and email for initial access.
- [x] New companies create a current-month period so they appear in the work queue.
- [x] Employees page has an enabled "Nuevo empleado" flow.
- [x] Creating an employee captures employee email for future login access.
- [x] Demo store records audit events for company and employee provisioning.

**Verification:**
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending next: connect these forms to backend provisioning actions and real repositories.

**Dependencies:** Task 18

**Files likely touched:**
- `cierrafe/src/app/(estudio)/empresas/page.tsx`
- `cierrafe/src/app/(estudio)/empleados/page.tsx`
- `cierrafe/src/lib/store.ts`

**Estimated scope:** Medium

## Task 20: Demo Study Provisioning Form
**Description:** Add an admin-facing demo flow to create a new accounting study with its initial owner access and commercial setup.

**Acceptance criteria:**
- [x] Admin commercial console has a visible create-study control.
- [x] Creating a study captures study name, owner name and owner email.
- [x] Creating a study captures initial plan, status and currency.
- [x] Newly created demo study appears in the admin study list and becomes selected.
- [x] The flow keeps owner access information in internal notes until real repositories are connected.

**Verification:**
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending next: connect this admin form to `crearEstudioConAccesoInicial` and persistent repositories.

**Dependencies:** Task 18

**Files likely touched:**
- `cierrafe/src/components/admin-commercial-console.tsx`

**Estimated scope:** Small

## Task 21: Provisioning Persistence Repositories
**Description:** Add PostgreSQL repository implementations for studies, users/accesses, companies and employees so provisioning actions can persist real data.

**Acceptance criteria:**
- [x] Studies repo can create, read and update study profile fields.
- [x] Users repo can create an invited user and attach study/company scoped access.
- [x] Companies repo can create, list, read and update companies within a tenant.
- [x] Employees repo can create employee ficha, labor relation and salary vigencias.
- [x] Employee reads reconstruct the domain employee from ficha, relation and vigencias tables.
- [x] Fine-grained access roles are mapped conservatively to the current membership schema.

**Verification:**
- [x] Unit test for role mapping.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending later: apply migrations and run repository integration tests against PostgreSQL.
- [ ] Pending later: add dedicated company/employee account tables if we need role fidelity beyond the current membership schema.

**Dependencies:** Task 18

**Files likely touched:**
- `cierrabe/src/datos/repos/provisioning.ts`
- `cierrabe/src/datos/repos/index.ts`

**Estimated scope:** Medium

## Task 22: Frontend Provisioning Actions
**Description:** Connect the demo provisioning forms to Next Server Actions that call backend provisioning actions and PostgreSQL repositories when real backend configuration is available.

**Acceptance criteria:**
- [x] Admin create-study flow calls a Server Action before updating the demo UI.
- [x] Study create-company flow calls a Server Action before updating the demo UI.
- [x] Study create-employee flow calls a Server Action before updating the demo UI.
- [x] Server Actions call `cierrabe` provisioning actions and real repositories when `DATABASE_URL` and required UUID IDs exist.
- [x] Server Actions fall back to demo mode with clear messages when running against demo IDs or without database configuration.
- [x] Protected backend provisioning actions still perform authorization and validation server-side.

**Verification:**
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending later: load real study/company IDs from authenticated sessions instead of development env vars.
- [ ] Pending later: show real success messages after closing drawers without relying only on local demo state.
- [ ] Pending later: create current-month period in PostgreSQL when a company is created.

**Dependencies:** Task 18, Task 19, Task 20, Task 21

**Files likely touched:**
- `cierrafe/src/app/admin/actions.ts`
- `cierrafe/src/app/(estudio)/actions.ts`
- `cierrafe/src/components/admin-commercial-console.tsx`
- `cierrafe/src/app/(estudio)/empresas/page.tsx`
- `cierrafe/src/app/(estudio)/empleados/page.tsx`

**Estimated scope:** Medium

## Task 23: Initial Company Period Persistence
**Description:** When a real company is provisioned, create the initial payroll period in PostgreSQL so the new company appears in the work queue immediately.

**Acceptance criteria:**
- [x] PostgreSQL `PeriodosRepo` implementation can list, read and save periods within tenant scope.
- [x] Saving a period upserts by company and month.
- [x] Company provisioning action accepts an optional initial period.
- [x] Company provisioning action saves the initial period using the newly created company id.
- [x] Study create-company Server Action sends the current demo month as the initial period when real backend mode is active.
- [x] Audit detail mentions the initial period when one is created.

**Verification:**
- [x] Unit test for company provisioning with initial period.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending later: derive the operational month from real tenant settings instead of the reproducible demo month.
- [ ] Pending later: persist period versions, approvals, notes and rectifications when liquidation workflow moves from demo store to backend.

**Dependencies:** Task 21, Task 22

**Files likely touched:**
- `cierrabe/src/acciones/altas.ts`
- `cierrabe/src/datos/repos/provisioning.ts`
- `cierrabe/tests/altas.test.ts`
- `cierrafe/src/app/(estudio)/actions.ts`

**Estimated scope:** Small

## Task 24: Shared Development Backend Context
**Description:** Centralize the temporary development access contexts used by Server Actions so real backend writes require explicit database configuration and UUID actor ids.

**Acceptance criteria:**
- [x] Development system-admin context is created from `CIERRA_DEV_ADMIN_ID` instead of a hardcoded demo id.
- [x] Development study-admin context is created from `CIERRA_DEV_ESTUDIO_ID` and `CIERRA_DEV_USUARIO_ID`.
- [x] Server Actions fall back to demo mode when `DATABASE_URL` or required UUID env vars are missing.
- [x] Admin commercial/provisioning actions share the same context helper.
- [x] Study provisioning actions share the same context helper.
- [x] `.env.example` documents the development UUID variables.

**Verification:**
- [x] Unit tests for backend development context resolution.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`

**Notes:**
- [ ] Pending later: replace development env contexts with authenticated session resolution.
- [ ] Pending later: seed or admin-create the UUID users/studies required for local real-backend testing.

**Dependencies:** Task 22, Task 23

**Files likely touched:**
- `.env.example`
- `cierrafe/src/lib/backend-dev-context.ts`
- `cierrafe/src/app/admin/actions.ts`
- `cierrafe/src/app/(estudio)/actions.ts`
- `cierrafe/tests/backend-dev-context.test.ts`

**Estimated scope:** Small

## Task 25: Development Database Seed
**Description:** Add an idempotent development seed so local PostgreSQL can create the UUID admin, study and study user expected by the development backend contexts.

**Acceptance criteria:**
- [x] Backend has a `db:seed:dev` script.
- [x] Workspace root exposes `pnpm db:seed:dev`.
- [x] Seed creates or updates the development study from env/default values.
- [x] Seed creates or updates the development system admin user.
- [x] Seed creates or updates the development study admin user and membership.
- [x] Seed closes the PostgreSQL pool after finishing.
- [x] README documents the local backend seed flow.

**Verification:**
- [x] Unit tests for seed configuration defaults and env overrides.
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm build`
- [ ] Manual `pnpm db:seed:dev` against local PostgreSQL. Pending because PostgreSQL may not be running locally.

**Notes:**
- [x] Development seed now creates password credentials for the seeded admin and study user.
- [x] Base commercial plans/modules are seeded into PostgreSQL development environments in Task 27.

**Dependencies:** Task 24

**Files likely touched:**
- `package.json`
- `cierrabe/package.json`
- `.env.example`
- `README.md`
- `cierrabe/src/dev/*`
- `cierrabe/src/datos/db.ts`
- `cierrabe/tests/seed-desarrollo.test.ts`

**Estimated scope:** Small

## Task 26: Admin Theme Contrast Fix
**Description:** Fix the admin dashboard contrast issue where dark-theme text could render over light cards because Tailwind color utilities were generated from fixed values while the body used runtime theme variables.

**Acceptance criteria:**
- [x] Theme color utilities are backed by runtime CSS variables for light/dark mode.
- [x] Admin panels, inputs and secondary buttons use themed surfaces instead of fixed white backgrounds.
- [x] Uploaded company logos can still keep a white backing for readability.
- [x] `/admin` remains reachable on the local dev server.

**Verification:**
- [x] `npx pnpm@11.22.0 lint`
- [x] `npx pnpm@11.22.0 build`
- [x] `Invoke-WebRequest http://localhost:3000/admin`
- [x] `npm run visual:audit`

**Notes:**
- [x] Visual audit tooling added with Playwright using the installed Edge channel.
- [x] Screenshots cover login, study dashboard, employee portal and receipt document in light/dark where applicable.

**Dependencies:** Task 10, Task 11

**Files likely touched:**
- `cierrafe/src/app/globals.css`
- `cierrafe/src/components/ui.tsx`
- `cierrafe/src/components/admin-commercial-console.tsx`
- `cierrafe/src/app/admin/page.tsx`

**Estimated scope:** Small

## Task 27: Development Commercial Seed
**Description:** Seed the base commercial module catalog and initial packages into PostgreSQL development environments.

**Acceptance criteria:**
- [x] Development seed inserts or updates all backend module catalog rows.
- [x] Development seed inserts or updates the base packages `basico`, `profesional` and `full`.
- [x] Plan-module relationships are recreated idempotently for those base packages.
- [x] Seed output reports seeded commercial modules and plans.
- [x] Plan definitions use stable UUIDs compatible with the admin demo console.

**Verification:**
- [x] Backend unit tests for plan definitions and module references.
- [x] `npm run typecheck` in `cierrabe`
- [x] `npm test` in `cierrabe`

**Notes:**
- [ ] Manual `pnpm db:seed:dev` against local PostgreSQL remains pending until PostgreSQL is available.

**Dependencies:** Task 25, Task 26

**Files touched:**
- `cierrabe/src/dev/seed-comercial.ts`
- `cierrabe/src/dev/seed-desarrollo.ts`
- `cierrabe/tests/seed-comercial.test.ts`
- `README.md`

**Estimated scope:** Small

## Task 28: Study Provisioning Feedback
**Description:** Keep create-company and create-employee Server Action results visible after the drawer closes, so real/demo success or failure messages are not lost.

**Acceptance criteria:**
- [x] Company creation shows the Server Action result outside the drawer after a successful submit.
- [x] Employee creation shows the Server Action result outside the drawer after a successful submit.
- [x] Drawer validation and Server Action errors remain visible while the drawer stays open.
- [x] Feedback uses themed success/error surfaces instead of ad hoc inline colors.
- [x] Opening a new create drawer clears the previous page-level result.

**Verification:**
- [x] `npm run typecheck` in `cierrafe`
- [x] `npm run lint` in `cierrafe`
- [x] `npm run build` in `cierrafe`

**Notes:**
- [ ] Pending later: replace development env contexts with authenticated session resolution.

**Dependencies:** Task 24, Task 26

**Files touched:**
- `cierrafe/src/components/ui.tsx`
- `cierrafe/src/app/(estudio)/empresas/page.tsx`
- `cierrafe/src/app/(estudio)/empleados/page.tsx`

**Estimated scope:** Small

## Task 29: Development Session Backend Context
**Description:** Resolve temporary backend access contexts from the active development session cookie so Server Actions use the selected development role instead of always assuming the default env role.

**Acceptance criteria:**
- [x] Admin Server Actions require an active system-admin development session before using real backend context.
- [x] Study provisioning Server Actions derive the active study role from the development session.
- [x] Payroll operator and read-only study sessions map to their matching backend roles.
- [x] Delegated admin-as-study sessions preserve system-admin delegation metadata when UUIDs are configured.
- [x] Missing or mismatched sessions continue to fall back to demo mode instead of writing with the wrong actor.

**Verification:**
- [x] `npm run typecheck` in `cierrafe`
- [x] `npm test -- backend-dev-context` in `cierrafe`
- [x] `npm run lint` in `cierrafe`
- [x] `npm run build` in `cierrafe`

**Notes:**
- [ ] Pending later: replace development session cookie parsing with the real authenticated session resolver.

**Dependencies:** Task 17, Task 24

**Files touched:**
- `cierrafe/src/lib/backend-dev-context.ts`
- `cierrafe/src/app/admin/actions.ts`
- `cierrafe/src/app/(estudio)/actions.ts`
- `cierrafe/tests/backend-dev-context.test.ts`

**Estimated scope:** Small

## Task 30: Real Password Login And Session Cookie
**Description:** Connect the login form to backend password authentication when PostgreSQL is configured, while preserving explicit development shortcuts as a separate fallback.

**Acceptance criteria:**
- [x] Backend exposes a password authentication service with generic invalid-credential errors.
- [x] Backend PostgreSQL repo reads users, password hashes and available access spaces.
- [x] Suspended users are rejected during password authentication.
- [x] Development seed creates password credentials for the system admin and study admin users.
- [x] Frontend login attempts real password auth when `DATABASE_URL` is configured.
- [x] Frontend emits an httpOnly signed real session cookie after successful real login.
- [x] Protected route guards accept valid real sessions in addition to development sessions.
- [x] Logout clears both real and development session cookies.
- [x] Development quick-access buttons remain available in non-production builds.

**Verification:**
- [x] `npm run typecheck` in `cierrabe`
- [x] `npm test -- auth seed-desarrollo` in `cierrabe`
- [x] `npm run typecheck` in `cierrafe`
- [x] `npm test -- auth-session dev-session` in `cierrafe`
- [x] `npm run lint` in `cierrafe`
- [x] `npm run build` in `cierrafe`

**Notes:**
- [ ] Pending later: persist real sessions in the `sesiones` table and support revocation/refresh.
- [ ] Pending later: add account selection when a user has multiple access spaces.
- [ ] Pending later: resolve Server Action backend contexts from the real session instead of the development session bridge.

**Dependencies:** Task 5, Task 17, Task 25, Task 29

**Files touched:**
- `cierrabe/src/auth/*`
- `cierrabe/src/datos/repos/auth.ts`
- `cierrabe/src/dev/*`
- `cierrabe/tests/auth.test.ts`
- `cierrabe/tests/seed-desarrollo.test.ts`
- `cierrafe/src/app/login/actions.ts`
- `cierrafe/src/lib/auth-session.ts`
- `cierrafe/src/lib/dev-auth.ts`
- `cierrafe/tests/auth-session.test.ts`
- `.env.example`
- `README.md`

**Estimated scope:** Medium

## Task 31: Development Login Autofill
**Description:** Change login development shortcuts so they fill the email/password fields and require pressing the main login button, exercising the same login form path.

**Acceptance criteria:**
- [x] Development shortcut buttons no longer submit their own login action from the login screen.
- [x] Each development shortcut fills the email field.
- [x] Each development shortcut fills the configured development password.
- [x] Users must press the main "Entrar" button after selecting a shortcut.
- [x] Development password is not passed to the client when shortcuts are hidden in production.

**Verification:**
- [x] `npm run typecheck` in `cierrafe`
- [x] `npm run lint` in `cierrafe`
- [x] `npm run build` in `cierrafe`

**Notes:**
- [ ] Pending later: seed real password credentials for company and employee demo users if they should enter through PostgreSQL real auth.

**Dependencies:** Task 30

**Files touched:**
- `cierrafe/src/app/login/login-form.tsx`
- `cierrafe/src/app/login/page.tsx`

**Estimated scope:** Small

## Task 32: Branded Loading Overlay
**Description:** Add a Cierra-branded loading overlay for visible delays, using the isotipo as a watermark/fill animation instead of a generic spinner.

**Acceptance criteria:**
- [x] Loader dims/desaturates the current screen with a subtle grey overlay.
- [x] Loader centers the Cierra symbol as a watermark.
- [x] Loader uses a large Cierra symbol.
- [x] Loader shows the colored Cierra symbol filling slowly along the symbol curve.
- [x] The yellow end-cap pulses after the first fill while loading continues.
- [x] Successful login waits long enough for the first fill to complete before redirecting.
- [x] Login pending state uses the branded loader.
- [x] App route loading state uses the branded loader.
- [x] Reduced-motion users get a static filled symbol instead of the animation.

**Verification:**
- [x] `npm run typecheck` in `cierrafe`
- [x] `npm run lint` in `cierrafe`
- [x] `npm run build` in `cierrafe`

**Dependencies:** Task 30, Task 31

**Files touched:**
- `cierrafe/src/components/cierra-loading.tsx`
- `cierrafe/src/app/loading.tsx`
- `cierrafe/src/app/login/login-form.tsx`
- `cierrafe/src/app/globals.css`

**Estimated scope:** Small
