# Implementation Plan: Cierra MVP real

## Overview
Convertir el prototipo local en una aplicacion productiva por slices verticales. La prioridad es fundacion segura: contratos de datos, Postgres multi-tenant, auth y auditoria. Luego migrar las pantallas existentes una a una desde Zustand hacia Server Actions/repositorios.

## Architecture Decisions
- Mantener Next.js App Router y reutilizar UI actual.
- Separar el repo en `cierrafe/` para frontend y `cierrabe/` para backend/base.
- Introducir `cierrabe/src/datos/` como frontera unica de persistencia.
- Tratar `docs/accesos-marca-y-tenancy.md` como contrato base de roles, permisos y marca.
- Tratar `docs/modulos-paquetes-y-facturacion.md` como contrato base de modulos, paquetes y cobro interno.
- Usar contratos TypeScript antes de SQL para evitar acoplar pantallas a la DB.
- Implementar multi-tenancy desde el primer schema, no como parche posterior.
- Implementar permisos en backend; el frontend solo refleja lo que el backend permite.
- Implementar chequeo de modulo contratado en backend para toda funcion opcional.
- Usar login mixto: email/contrasena y magic link como base, con opcion futura de Google/Microsoft.
- Guardar preferencias visuales por usuario: claro, oscuro o sistema.
- Cobrar inicialmente fijo mensual por modulo o paquete de modulos.
- Priorizar modulos que sustituyen las planillas Excel actuales del estudio.
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
- Task 6: Modelar usuarios, roles, membresias y alcance para admin sistema, estudio, empresa y empleado.
- Task 7: Integrar login mixto y resolver contexto de acceso por request.
- Task 8: Implementar politicas de autorizacion backend para cada actor.
- Task 9: Proteger rutas de estudio, empresa, empleado y admin con sesion real.
- Task 10: Reemplazar selector de usuario demo por sesion y selector de espacio cuando aplique.

## Checkpoint: Auth
- Admin sistema ve todos los estudios y actividad global.
- Usuario de estudio ve solo sus empresas.
- Usuario de empresa ve solo su empresa y empleados.
- Empleado ve solo sus recibos y datos personales.
- Liquidador no puede reabrir/configurar si su rol no lo permite.
- Lectura no puede escribir.
- Intentos cross-tenant devuelven `403` o `404` seguro.

## Phase 3: Profiles, Branding and Theme
- Task 11: Perfil editable de estudio con nombre visible, datos basicos, logo/foto y auditoria.
- Task 12: Perfil editable de empresa con nombre visible, datos permitidos, logo y auditoria.
- Task 13: Preferencia visual por usuario: modo claro, modo oscuro o sistema.
- Task 14: Aplicar marca contextual en estudio, empresa, empleado, recibos y portales.

## Phase 4: Modules, Packages and Billing Foundation
- Task 15: Catalogo de modulos funcionales con codigos estables, empezando por los modulos que sustituyen Excel.
- Task 16: Paquetes comerciales y modulos incluidos.
- Task 17: Contrato/suscripcion por estudio con add-ons y overrides.
- Task 18: Guard de modulo contratado en backend y UI.
- Task 19: Resumen interno de cobro fijo por estudio, modulo y paquete.

## Phase 5: Core Payroll Flow
- Task 20: Migrar empresas/empleados a backend real.
- Task 21: Implementar periodos y solicitudes de novedades.
- Task 22: Implementar novedades con auditoria.
- Task 23: Calcular liquidacion versionada desde datos persistidos.
- Task 24: Cerrar periodo y publicar recibos.

## Checkpoint: Core Flow
- Crear/cargar/calcular/cerrar un mes end-to-end.
- Recibo publicado reproduce version cerrada.
- Auditoria registra cada escritura.

## Phase 6: Portals and Imports
- Task 25: Portal cliente con acceso restringido a una empresa.
- Task 26: Portal empleado restringido a un empleado.
- Task 27: Importador Excel persistente con validacion y resumen.
- Task 28: Exportacion BPS basada en liquidacion cerrada.

## Phase 7: Production Readiness
- Task 29: Docker/standalone para Coolify.
- Task 30: Variables de entorno, headers de seguridad y logs sin PII.
- Task 31: Backups y restore documentados.
- Task 32: Playwright para recorridos criticos.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Mezcla de datos entre estudios | High | RLS, `estudio_id` obligatorio y pruebas de aislamiento desde Phase 1 |
| Empresa o empleado accede por URL a datos ajenos | High | Politicas backend por actor, pruebas negativas y respuestas 403/404 |
| Admin soporte modifica datos sin trazabilidad | High | Auditoria obligatoria y modo soporte con motivo |
| Estudio usa funciones no contratadas | High | Guard backend de modulo contratado y pruebas negativas |
| Cobro calculado con reglas ambiguas | Medium | Catalogo de precios versionado, snapshots mensuales y ajustes manuales auditados |
| Reglas laborales incompletas | High | Bloquear fuera de alcance, casos dorados y validacion con contador |
| Migracion demasiado grande desde Zustand | Medium | Slices por flujo, mantener demo hasta reemplazo completo |
| Auth mal integrada con Server Actions | Medium | Contexto unico de sesion/tenant y pruebas por rol |
| Excel trae datos inconsistentes | Medium | Importacion con preview, avisos y auditoria |
| Logos/tema rompen legibilidad | Medium | Tokens de tema, contraste AA y fallback con iniciales |

## Open Questions
- Confirmar proveedor final de auth si Better Auth sigue firme.
- Confirmar si un usuario puede pertenecer a mas de un estudio/empresa.
- Confirmar nombres comerciales iniciales de paquetes.
- Confirmar moneda inicial, IVA y formato de precios.
- Confirmar si desarrollo local usara Docker Compose para Postgres.
- Confirmar prioridad: estudio interno primero o portal cliente primero.
