# Implementation Plan: Cierra MVP real

## Overview
Convertir el prototipo local en una aplicacion productiva por slices verticales. La prioridad es fundacion segura: contratos de datos, Postgres multi-tenant, auth y auditoria. Luego migrar las pantallas existentes una a una desde Zustand hacia Server Actions/repositorios.

## Architecture Decisions
- Mantener Next.js App Router y reutilizar UI actual.
- Separar el repo en `cierrafe/` para frontend y `cierrabe/` para backend/base.
- Introducir `cierrabe/src/datos/` como frontera unica de persistencia.
- Usar contratos TypeScript antes de SQL para evitar acoplar pantallas a la DB.
- Implementar multi-tenancy desde el primer schema, no como parche posterior.
- Mantener el seed/demo hasta que cada slice tenga backend real equivalente.

## Phase 1: Foundation
- Task 1: Definir contratos de datos, contexto de tenant y errores de dominio.
- Task 2: Agregar tooling de tests/typecheck y primer test del motor actual.
- Task 3: Agregar Drizzle/Postgres, schema inicial y migracion local.
- Task 4: Crear repositorios para estudios, empresas y empleados con adaptador Postgres.
- Task 5: Pruebas de aislamiento basicas entre estudios.

## Checkpoint: Foundation
- `corepack pnpm lint`
- `corepack pnpm build`
- Tests unitarios y de repositorio verdes.
- Una consulta de empleados filtra por estudio.

## Phase 2: Auth and Permissions
- Task 6: Integrar Better Auth para usuarios del estudio.
- Task 7: Modelar membresias, roles y empresas permitidas.
- Task 8: Proteger rutas de estudio con sesion real.
- Task 9: Reemplazar selector de usuario demo por sesion.

## Checkpoint: Auth
- Un usuario admin ve su estudio.
- Un liquidador no puede reabrir/configurar.
- Lectura no puede escribir.
- Intentos cross-tenant devuelven error.

## Phase 3: Core Payroll Flow
- Task 10: Migrar empresas/empleados a backend real.
- Task 11: Implementar periodos y solicitudes de novedades.
- Task 12: Implementar novedades con auditoria.
- Task 13: Calcular liquidacion versionada desde datos persistidos.
- Task 14: Cerrar periodo y publicar recibos.

## Checkpoint: Core Flow
- Crear/cargar/calcular/cerrar un mes end-to-end.
- Recibo publicado reproduce version cerrada.
- Auditoria registra cada escritura.

## Phase 4: Portals and Imports
- Task 15: Portal cliente con acceso restringido a una empresa.
- Task 16: Portal empleado restringido a un empleado.
- Task 17: Importador Excel persistente con validacion y resumen.
- Task 18: Exportacion BPS basada en liquidacion cerrada.

## Phase 5: Production Readiness
- Task 19: Docker/standalone para Coolify.
- Task 20: Variables de entorno, headers de seguridad y logs sin PII.
- Task 21: Backups y restore documentados.
- Task 22: Playwright para recorridos criticos.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Mezcla de datos entre estudios | High | RLS, `estudio_id` obligatorio y pruebas de aislamiento desde Phase 1 |
| Reglas laborales incompletas | High | Bloquear fuera de alcance, casos dorados y validacion con contador |
| Migracion demasiado grande desde Zustand | Medium | Slices por flujo, mantener demo hasta reemplazo completo |
| Auth mal integrada con Server Actions | Medium | Contexto unico de sesion/tenant y pruebas por rol |
| Excel trae datos inconsistentes | Medium | Importacion con preview, avisos y auditoria |

## Open Questions
- Confirmar proveedor final de auth si Better Auth sigue firme.
- Confirmar si desarrollo local usara Docker Compose para Postgres.
- Confirmar prioridad: estudio interno primero o portal cliente primero.
