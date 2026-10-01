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
