# Modulos, paquetes y facturacion

## Idea central
Cierra debe permitir que el equipo administrador active o desactive funciones por estudio contable y, al mismo tiempo, sepa cuanto cobrarle a cada estudio segun lo que tiene contratado.

Esto no es lo mismo que permisos de usuario.

- Permisos: dicen si una persona puede hacer algo dentro de su alcance.
- Modulos contratados: dicen si ese estudio tiene disponible esa funcion.
- Precios: dicen cuanto vale usar esa funcion, paquete o limite.

Ejemplo:

```text
Estudio Don Pedrito
  Modulo recibos de sueldo: activado
  Modulo envio automatico de recibos: desactivado
  Modulo portal empleado: activado
  Paquete contratado: Profesional
  Precio mensual estimado: $ X
```

## Objetivos
- Activar o desactivar funciones por estudio.
- Crear paquetes de funciones.
- Poner precio a funciones individuales o paquetes.
- Registrar desde cuando y hasta cuando aplica una contratacion.
- Saber cuanto cobrarle a cada estudio/contador.
- Mantener historial de cambios comerciales.
- Evitar que un estudio use una funcion no contratada aunque conozca la URL.

## Decisiones iniciales
- El login sera mixto: email/contrasena y magic link desde el inicio; Google/Microsoft queda como opcion futura o configurable si un estudio lo necesita.
- La estrategia comercial inicial sera cobro fijo mensual por modulo o por paquete de modulos.
- Los paquetes no necesitan cerrarse todos antes de seguir desarrollando. Se pueden definir al dar ingreso a cada estudio.
- El primer foco funcional sera reemplazar las planillas Excel actuales del estudio con modulos equivalentes dentro del sistema.
- La medicion de uso se guardara para control interno, soporte y futuras reglas comerciales, pero no sera la base principal del cobro inicial.

## Conceptos principales

### Modulo
Una capacidad funcional del sistema.

Ejemplos:
- Liquidacion de sueldos.
- Creacion de recibos de sueldo.
- Portal del empleado.
- Portal de empresa.
- Envio automatico de recibos por email.
- Envio automatico por WhatsApp.
- Importacion masiva desde Excel.
- Exportacion BPS.
- Dispersion de sueldos.
- Auditoria avanzada.
- Reportes avanzados.
- Multiusuario dentro del estudio.
- Firma o aceptacion digital de recibos.
- Almacenamiento de documentos laborales.

### Modulos iniciales para reemplazar Excel
Estos modulos salen del archivo Excel de RRHH usado como referencia inicial:

| Codigo | Nombre | Reemplaza o cubre |
|---|---|---|
| `rrhh_core` | Datos RRHH base | Datos Madre, empleados, empresas, parametros generales |
| `payroll_core` | Liquidacion de sueldos | Simuladores, nomina y calculos mensuales |
| `payroll_receipts` | Recibos de sueldo | Recibo y publicacion/descarga de recibos |
| `bps_exports` | BPS y CESS | CESS-BPS, CESS-BPS Socios y archivo de nomina |
| `irpf_calculation` | IRPF | IRPF e IRPF anticipo |
| `leave_management` | Licencias | Licencias, licencia gozada y saldos futuros |
| `salary_history` | Historia laboral/salarial | Historia y vigencias de sueldo/categoria |
| `accounting_entries` | Asiento de sueldos | Asiento sueldos y cuentas contables |
| `salary_disbursement` | Dispersion de sueldos | Control de liquidaciones, ordenes de pago y transferencias |
| `company_portal` | Portal empresa | Carga de novedades y aprobacion de liquidaciones |
| `employee_portal` | Portal empleado | Consulta personal de recibos y datos |
| `bulk_import_excel` | Importacion Excel | Alta/carga masiva desde planillas |
| `audit_basic` | Auditoria basica | Registro de actividad y cambios |

Estos codigos deben mantenerse estables. El nombre visible puede cambiar, pero el codigo interno no deberia cambiar una vez usado en contratos.

Cada modulo debe tener:
- Codigo interno estable.
- Nombre visible.
- Descripcion.
- Estado: activo, oculto, beta, discontinuado.
- Dependencias con otros modulos.
- Alcance: estudio, empresa, empleado o sistema.

Ejemplo:

```text
payroll_receipts
Nombre: Recibos de sueldo
Depende de: payroll_core
Alcance: estudio
```

### Feature flag
Es la llave tecnica que prende o apaga una funcion.

Ejemplo:
- `payroll_receipts`: true
- `automatic_receipt_email`: false

Regla importante:
El frontend puede ocultar botones, pero el backend siempre debe verificar si el modulo esta habilitado antes de ejecutar la accion.

### Paquete
Un grupo comercial de modulos.

Ejemplos posibles:
- Basico.
- Profesional.
- Premium.
- A medida.

Ejemplo de paquete:

```text
Paquete Profesional
Incluye:
- Empresas y empleados
- Liquidacion de sueldos
- Recibos de sueldo
- Portal empleado
- Portal empresa
No incluye:
- Envio automatico de recibos
- Dispersion de sueldos
- Reportes avanzados
```

### Add-on
Un modulo que se vende aparte del paquete.

Ejemplos:
- Envio automatico de recibos.
- Dispersion de sueldos.
- WhatsApp.
- Reportes avanzados.
- Firma digital.
- Mas almacenamiento.
- Soporte prioritario.

### Contrato o suscripcion del estudio
Representa lo que un estudio tiene contratado.

Debe guardar:
- Estudio.
- Paquete contratado.
- Add-ons activos.
- Precios acordados.
- Moneda.
- Fecha de inicio.
- Fecha de fin, si aplica.
- Estado: prueba, activo, pausado, cancelado, vencido.
- Notas internas comerciales.

## Niveles de habilitacion
Conviene permitir tres formas de activar funciones:

### 1. Por paquete
El estudio compra un paquete y recibe todos sus modulos.

Ejemplo:
- Don Pedrito tiene `Profesional`.
- Profesional incluye recibos y portal empleado.

### 2. Por modulo adicional
El estudio compra algo puntual ademas de su paquete.

Ejemplo:
- Don Pedrito tiene `Profesional`.
- Ademas compra `automatic_receipt_email`.

### 3. Override administrativo
El administrador puede prender o apagar algo manualmente.

Ejemplo:
- Activar envio automatico gratis por 30 dias.
- Desactivar temporalmente una funcion por falta de pago.
- Habilitar una beta a un estudio piloto.

Regla recomendada:
El permiso final se calcula combinando paquete + add-ons + overrides + estado del contrato.

## Precios
Los precios pueden ser simples al principio y crecer despues.

### Estrategia inicial de precio
El precio inicial sera fijo mensual.

Puede ser:
- Precio fijo mensual por paquete.
- Precio fijo mensual por modulo individual.
- Precio especial acordado manualmente para un estudio.

Por ahora no se cobrara principalmente por empresa, empleado, recibo o envio, aunque esos datos pueden guardarse para control interno y futuras decisiones.

### Tipos de precio futuros posibles
- Precio por empresa activa.
- Precio por empleado activo.
- Precio por recibo generado.
- Precio por envio realizado.
- Precio por almacenamiento usado.

### Ejemplos

```text
Modulo: Recibos de sueldo
Precio: incluido en paquete Profesional
```

```text
Modulo: Envio automatico de recibos por email
Precio: $ X mensual fijo
```

```text
Paquete Basico
Precio: $ X mensual fijo
Incluye los modulos acordados al dar de alta el estudio
```

## Facturacion interna
En una primera etapa no hace falta emitir facturas automaticamente desde Cierra. Si conviene guardar lo necesario para que el administrador sepa cuanto cobrar.

El sistema deberia poder mostrar:
- Estudios activos.
- Paquete contratado por cada estudio.
- Modulos adicionales activos.
- Cantidad de empresas activas.
- Cantidad de empleados activos.
- Cantidad de recibos generados.
- Cantidad de envios realizados.
- Precio mensual fijo acordado.
- Ajustes manuales.
- Observaciones internas.

Mas adelante se puede integrar facturacion real.

## Reglas de acceso por modulo
Cada accion importante debe chequear dos cosas:

1. Permiso del usuario.
2. Modulo contratado por el estudio.

Ejemplo:

```text
Accion: enviar recibos automaticamente

Debe cumplirse:
- Usuario pertenece al estudio.
- Usuario tiene permiso para publicar/enviar recibos.
- El estudio tiene activo `automatic_receipt_email`.
- El contrato del estudio esta activo o en periodo de prueba.
```

Si falla por permiso:
- Responder `403`.

Si falla por modulo no contratado:
- Mostrar mensaje claro, por ejemplo: "Este modulo no esta incluido en tu plan".

Si falla por contrato pausado o vencido:
- Mostrar mensaje de cuenta, no de error tecnico.

## Panel administrador necesario
El admin del sistema necesita una pantalla para:
- Crear y editar modulos.
- Crear y editar paquetes.
- Definir precios.
- Asignar paquete a un estudio.
- Definir el paquete inicial al dar ingreso a un estudio.
- Activar add-ons.
- Hacer overrides manuales.
- Ver resumen de cobro por estudio.
- Ver historial de cambios comerciales.
- Suspender o reactivar un contrato.

## Pantalla del estudio
El estudio puede ver:
- Su plan actual.
- Modulos incluidos.
- Modulos no incluidos.
- Limites del plan.
- Uso actual.
- Avisos cuando intenta usar algo no contratado.

En el MVP puede ser solo lectura. La contratacion la maneja el administrador.

## Auditoria
Deben quedar auditados:
- Cambio de paquete.
- Activacion/desactivacion de modulo.
- Cambio de precio.
- Alta o baja de add-on.
- Suspension o reactivacion de contrato.
- Override manual.
- Usuario administrador que hizo el cambio.
- Motivo o nota interna.

## Modelo conceptual de datos
Tablas esperadas:

- `modules`
- `plans`
- `plan_modules`
- `study_subscriptions`
- `subscription_addons`
- `module_overrides`
- `price_books`
- `price_items`
- `usage_events`
- `billing_snapshots`
- `commercial_audit_events`

### modules
Catalogo tecnico de funciones.

Campos:
- `id`
- `code`
- `name`
- `description`
- `status`
- `scope`
- `depends_on`

### plans
Paquetes comerciales.

Campos:
- `id`
- `code`
- `name`
- `description`
- `status`

### study_subscriptions
Contrato vigente de un estudio.

Campos:
- `id`
- `study_id`
- `plan_id`
- `status`
- `currency`
- `starts_at`
- `ends_at`
- `billing_notes`

### usage_events
Eventos medibles para cobro.

Ejemplos:
- recibo generado.
- recibo enviado.
- empleado activo del mes.
- empresa activa del mes.

Aunque el cobro inicial sea fijo, estos eventos ayudan a entender uso, soporte, rentabilidad y cambios futuros de plan.

## Alta de un estudio
Cuando se da ingreso a un estudio, el administrador debe poder definir:
- Datos del estudio.
- Usuario dueño o administrador inicial.
- Paquete inicial.
- Modulos activos.
- Precio fijo mensual acordado.
- Moneda.
- Fecha de inicio.
- Estado inicial: prueba o activo.
- Notas comerciales internas.

Esta accion debe dejar auditoria comercial y auditoria de acceso.

## Casos de abuso que deben fallar
- Un estudio intenta usar un modulo no contratado cambiando la URL.
- Un usuario intenta llamar directo a una accion backend de un modulo apagado.
- Un administrador de estudio intenta activarse modulos a si mismo.
- Un empleado intenta activar funciones comerciales.
- Un contrato pausado intenta generar nuevas acciones cobrables.
- Un admin cambia precios sin que quede auditoria.

## Criterios de aceptacion
- Los administradores pueden ver que modulos tiene contratado cada estudio.
- Un modulo apagado no aparece como accion principal en el frontend.
- Un modulo apagado tampoco se puede ejecutar desde backend.
- Los paquetes pueden agrupar varios modulos.
- Los add-ons pueden activar funciones fuera del paquete.
- Se puede calcular un resumen de cobro por estudio.
- Cambios comerciales quedan auditados.
- El sistema distingue permisos de usuario de modulos contratados.
