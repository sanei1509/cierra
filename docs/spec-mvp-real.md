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
La arquitectura de modulos contratados, paquetes, precios y facturacion interna queda definida en `docs/modulos-paquetes-y-facturacion.md`.

El alcance funcional inicial sera reemplazar, de forma ordenada y segura, las planillas Excel usadas por el estudio para RRHH, nomina, recibos, IRPF, BPS, licencias, historia y asiento de sueldos.

## Supuestos
- La app sigue siendo Next.js + TypeScript con App Router.
- La base productiva sera PostgreSQL con `estudio_id` en tablas de negocio.
- El login sera mixto: email/contrasena y magic link como base, con posibilidad de sumar Google/Microsoft para estudios que lo pidan.
- Cada usuario autenticado tendra rol y alcance: sistema, estudio, empresa o empleado.
- La cadena de altas sera: Cierra da acceso a estudios; el estudio da acceso a empresas; la empresa da acceso a empleados.
- Estudios y empresas podran editar su nombre visible, datos basicos y logo.
- Cada usuario podra elegir modo claro, oscuro o seguir sistema.
- Las funciones del sistema podran habilitarse o deshabilitarse por estudio mediante modulos, paquetes y add-ons.
- Los administradores podran ver que servicios tiene contratado cada estudio y cuanto cobrarle segun plan y modulos.
- El cobro inicial sera fijo mensual por modulo o por paquete de modulos. El uso se medira para referencia interna, no como regla principal de cobro inicial.
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
- `cierrabe/src/modulos/`: futuro catalogo de modulos, planes, contratos y chequeos de habilitacion.
- `cierrabe/src/facturacion/`: futura medicion de uso y resumen interno de cobro.
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
- Toda accion asociada a una funcion opcional valida que el modulo este contratado o habilitado.

## Testing Strategy
- Motor: casos unitarios y casos dorados anonimizados.
- Repositorios: pruebas de integracion contra Postgres de test.
- Aislamiento multi-tenant: pruebas obligatorias por tabla/ruta.
- Autorizacion por rol: pruebas para admin sistema, estudio, empresa y empleado.
- Modulos contratados: pruebas para funcion activa, funcion apagada, add-on y override administrativo.
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
  - Comprobar modulo contratado en backend antes de ejecutar funciones opcionales.
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
- Un administrador del sistema puede activar/desactivar modulos por estudio.
- Un administrador del sistema puede asignar paquete, add-ons y precios a un estudio.
- Un administrador del sistema puede dar ingreso a un estudio y, en ese momento, definir su paquete inicial, modulos activos y precio fijo mensual.
- Un estudio puede dar ingreso a sus empresas cliente.
- Una empresa puede dar ingreso a sus empleados.
- Un estudio puede operar empresas y empleados de sus clientes segun permisos.
- Un estudio puede editar su perfil y logo.
- Una empresa puede entrar, ver su pantalla con nombre/logo propio y editar datos permitidos.
- Un cliente puede cargar novedades del mes.
- El estudio puede calcular una version, revisarla, aprobar/cerrar y publicar recibos.
- Los recibos de sueldo deben mostrar el nombre de la empresa y, si existe, su logo cargado.
- El empleado solo puede ver sus recibos.
- Cada usuario puede elegir modo claro, oscuro o sistema.
- Un estudio no puede usar funciones no contratadas aunque intente acceder por URL o request directa.
- El sistema puede mostrar un resumen interno de cobro por estudio.
- La auditoria permite reconstruir cambios importantes.
- Pruebas de aislamiento fallan si se intenta leer datos de otro estudio.
- `corepack pnpm lint` y `corepack pnpm build` pasan.

## Open Questions
- Dominio definitivo y ambientes (`app`, `pruebas`, demo).
- Datos reales para casos dorados y contador asesor.
- Politica final de redondeo por concepto.
- Formato real de exportacion BPS.
- Decision legal sobre ubicacion de datos y contratos Ley 18.331.
- Definir si una misma persona puede tener varios roles y elegir espacio al entrar.
- Definir moneda inicial, impuestos y si los precios se guardan con IVA incluido o sin IVA.
- Definir nombres comerciales definitivos de los paquetes iniciales.
