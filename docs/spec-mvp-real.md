# Spec: Cierra MVP real

## Objetivo
Construir el sistema productivo de liquidacion de sueldos para estudios contables de Uruguay, partiendo del prototipo actual pero reemplazando los datos en `localStorage` por backend real, autenticacion, base PostgreSQL multi-tenant, auditoria y pruebas.

Usuarios principales:
- Administrador del sistema: administra Cierra, ve todo, habilita estudios y audita actividad global.
- Estudio contable: administradores, liquidadores y perfiles de lectura.
- Cliente empresa: carga novedades y aprueba liquidaciones.
- Empleado: consulta recibos y datos propios.

El primer hito es un MVP operable para 1 o 2 estudios piloto, con empresas, empleados, periodos mensuales, novedades, liquidacion versionada, recibos publicados y auditoria basica.

La arquitectura de accesos, marca y aislamiento queda definida en `docs/accesos-marca-y-tenancy.md`.

## Supuestos
- La app sigue siendo Next.js + TypeScript con App Router.
- La base productiva sera PostgreSQL con `estudio_id` en tablas de negocio.
- Cada usuario autenticado tendra rol y alcance: sistema, estudio, empresa o empleado.
- Estudios y empresas podran editar su nombre visible, datos basicos y logo.
- Cada usuario podra elegir modo claro, oscuro o seguir sistema.
- El prototipo visual actual se reutiliza; cambia la fuente de datos.
- Los montos productivos se migran a centesimos enteros antes de usar casos reales.
- La fecha de demo septiembre 2026 se mantiene solo para datos de prueba.
- Los valores normativos importados desde Excel quedan como referenciales hasta validacion profesional.

## Tech Stack
- Next.js `16.3.6`
- React `19.2.8`
- TypeScript `5.9.3`
- Tailwind CSS `4.3.3`
- Zustand para demo local transitoria
- SheetJS `xlsx` para importacion/exportacion Excel
- Futuro inmediato: PostgreSQL, Drizzle ORM, Better Auth, Vitest y Playwright

## Commands
- Instalar: `corepack pnpm install`
- Desarrollo: `corepack pnpm dev`
- Lint: `corepack pnpm lint`
- Build: `corepack pnpm build`
- Typecheck, cuando se agregue script: `corepack pnpm typecheck`
- Tests, cuando se agreguen: `corepack pnpm test`

## Project Structure
- `cierrafe/src/app/`: rutas Next.js y pantallas.
- `cierrafe/src/components/`: UI reusable.
- `cierrafe/src/lib/`: dominio demo actual, motor, tipos, formato, validaciones.
- `cierrafe/tests/`: pruebas del frontend/motor actual.
- `cierrabe/src/datos/`: acceso a datos real, schema, repositorios y contratos de persistencia.
- `cierrabe/src/dominio/`: tipos de dominio del backend.
- `cierrabe/drizzle/`: migraciones SQL.
- `cierrabe/src/acciones/`: futuras acciones/casos de uso del backend.
- `cierrabe/src/auth/`: futura configuracion de autenticacion y permisos.
- `cierrabe/src/permisos/`: futuras politicas de autorizacion y alcance por actor.
- `cierrabe/src/motor/`: futuro motor productivo, separado de UI y DB.
- `cierrabe/src/pdf/`: futuras plantillas de recibos.
- `tests/e2e/`: futuros recorridos Playwright.
- `docs/`: decisiones, specs y arquitectura.
- `tasks/`: plan de implementacion y checklist vivo.

## Code Style
Contratos primero, implementaciones chicas y explicitas:

```ts
export interface EmpleadosRepo {
  listarPorEmpresa(ctx: TenantContext, empresaId: EmpresaId): Promise<Empleado[]>;
  obtener(ctx: TenantContext, empleadoId: EmpleadoId): Promise<Empleado | null>;
}

export async function listarEmpleadosEmpresa(ctx: TenantContext, repo: EmpleadosRepo, empresaId: EmpresaId) {
  assertPuedeVerEmpresa(ctx, empresaId);
  return repo.listarPorEmpresa(ctx, empresaId);
}
```

Convenciones:
- Tipos y contratos en castellano cuando ya existe dominio en castellano.
- Modulos de dominio no importan UI.
- Las pantallas no hablan directo con SQL.
- Validacion en bordes: formularios, Server Actions, APIs, imports y variables de entorno.
- Auditoria en toda escritura de negocio.
- Toda lectura/escritura protegida recibe un contexto de acceso y valida pertenencia.

## Testing Strategy
- Motor: casos unitarios y casos dorados anonimizados.
- Repositorios: pruebas de integracion contra Postgres de test.
- Aislamiento multi-tenant: pruebas obligatorias por tabla/ruta.
- Autorizacion por rol: pruebas para admin sistema, estudio, empresa y empleado.
- Preferencias visuales: pruebas de persistencia de tema por usuario cuando se implemente auth real.
- Server Actions: validacion, permisos, errores y auditoria.
- UI: Playwright para recorridos principales del estudio, cliente y empleado.
- Build/lint/typecheck obligatorios antes de publicar.

## Boundaries
- Always:
  - Mantener el sistema compilable despues de cada slice.
  - Validar entradas externas.
  - Registrar auditoria para escrituras.
  - Reutilizar componentes y reglas existentes si aplican.
  - Separar contratos de implementacion.
  - Comprobar permisos en backend aunque el frontend oculte botones.
- Ask first:
  - Cambiar proveedor de auth/base/deploy.
  - Exponer datos reales o secretos.
  - Eliminar funcionalidades del prototipo.
  - Tomar decisiones normativas contables no validadas.
- Never:
  - Guardar secretos en el repo.
  - Mezclar datos entre estudios.
  - Calcular casos fuera de alcance con estimaciones silenciosas.
  - Reescribir todo el frontend sin necesidad.

## Success Criteria
- Un usuario del estudio puede iniciar sesion y operar solo su estudio.
- Un administrador del sistema puede ver y gestionar todos los estudios.
- Un estudio puede crear empresa y empleado con vigencias.
- Un estudio puede editar su perfil y logo.
- Una empresa puede entrar, ver su pantalla con nombre/logo propio y editar datos permitidos.
- Un cliente puede cargar novedades del mes.
- El estudio puede calcular una version, revisarla, aprobar/cerrar y publicar recibos.
- El empleado solo puede ver sus recibos.
- Cada usuario puede elegir modo claro, oscuro o sistema.
- La auditoria permite reconstruir cambios importantes.
- Pruebas de aislamiento fallan si se intenta leer datos de otro estudio.
- `corepack pnpm lint` y `corepack pnpm build` pasan.

## Open Questions
- Dominio definitivo y ambientes (`app`, `pruebas`, demo).
- Datos reales para casos dorados y contador asesor.
- Politica final de redondeo por concepto.
- Formato real de exportacion BPS.
- Decision legal sobre ubicacion de datos y contratos Ley 18.331.
- Definir si el login inicial usa email/password, magic links, Google/Microsoft o combinacion.
- Definir si una misma persona puede tener varios roles y elegir espacio al entrar.
