# Accesos, marca y aislamiento de datos

## Idea central
Cierra es una sola plataforma, pero cada actor debe sentir que entra a su propio espacio y solo ve lo que le corresponde.

La regla base es:

> La pantalla puede ayudar a ordenar la experiencia, pero la seguridad real vive en el backend.

Eso significa que aunque alguien escriba una URL a mano, modifique una request o intente acceder a datos de otro cliente, el backend debe bloquearlo.

## Actores del sistema

### Administrador del sistema
Es el equipo dueño de Cierra.

Puede:
- Ver todos los estudios contables.
- Crear, activar, suspender o quitar acceso a contadores/estudios.
- Cargar los datos iniciales de un estudio contable y registrar su usuario dueño/administrador.
- Ver todas las empresas asociadas a cada estudio.
- Ver empleados, periodos, liquidaciones, recibos, errores y actividad.
- Revisar auditoria global del sistema.
- Entrar en modo soporte para ayudar, dejando registro de auditoria.
- Configurar parametros globales, planes, limites y estado operativo.

No debe:
- Modificar datos de negocio sin dejar auditoria clara.
- Ver o descargar datos sensibles sin una razon operativa.

### Estudio contable o contador
Es el usuario cliente principal de Cierra.

Puede:
- Entrar con su login propio.
- Ver solo su estudio y sus empresas.
- Crear y editar su perfil de estudio.
- Subir o cambiar logo del estudio.
- Cargar nombre visible, razon social, RUT, telefono, email y otros datos de contacto.
- Elegir modo claro u oscuro para su usuario.
- Gestionar empresas propias.
- Cargar los datos iniciales de sus empresas cliente.
- Crear, activar, suspender o quitar acceso a usuarios de sus empresas cliente.
- Gestionar empleados de sus empresas.
- Liquidar sueldos, publicar recibos y ver auditoria de su propio espacio.
- Invitar usuarios internos del estudio, por ejemplo administrador, liquidador o solo lectura.

No puede:
- Ver estudios de otros contadores.
- Ver empresas de otros estudios.
- Ver empleados de empresas ajenas.
- Acceder a auditoria global de Cierra.

### Empresa cliente
Es la empresa que trabaja con un estudio contable.

Puede:
- Entrar con su login propio.
- Ver solo su propia empresa.
- Ver su pantalla con su nombre claramente visible.
- Subir o cambiar su logo si quiere.
- Editar datos permitidos de su perfil, como nombre comercial, logo, telefono, contactos, email y preferencias.
- Elegir modo claro u oscuro para su usuario.
- Ver sus propios empleados.
- Cargar los datos iniciales de sus empleados.
- Crear, activar, suspender o quitar acceso a sus empleados.
- Cargar novedades mensuales de sus empleados.
- Adjuntar comprobantes cuando corresponda.
- Revisar liquidaciones enviadas por el estudio.
- Aprobar o devolver liquidaciones con comentario.
- Ver recibos publicados de su empresa, segun permisos definidos.

No puede:
- Ver otras empresas del mismo estudio.
- Ver empresas de otros estudios.
- Ver datos internos del estudio contable.
- Ver datos personales de empleados fuera de su empresa.

### Empleado
Es una persona trabajadora vinculada a una empresa.

Puede:
- Entrar con su login propio.
- Ver solo su perfil personal.
- Ver sus recibos publicados.
- Descargar sus recibos.
- Ver sus datos laborales visibles: empresa, cargo, fecha de ingreso, cuenta de cobro y otros datos permitidos.
- Elegir modo claro u oscuro para su usuario.
- Actualizar ciertos datos personales si el flujo lo permite, por ejemplo telefono, direccion o email, sujeto a aprobacion si aplica.

No puede:
- Ver otros empleados.
- Ver informacion financiera global de la empresa.
- Ver liquidaciones de otros empleados.
- Ver empresas ajenas.
- Ver datos de otros estudios contables.

## Jerarquia de datos
La pertenencia de datos se modela asi:

```text
Cierra
  -> estudio contable
      -> usuarios del estudio
      -> empresas
          -> usuarios de empresa
          -> empleados
              -> usuario empleado
              -> recibos
          -> periodos
              -> novedades
              -> liquidaciones
              -> aprobaciones
              -> archivos BPS
      -> auditoria del estudio
  -> auditoria global
```

## Jerarquia de altas y accesos
La creacion de cuentas y registros sigue una cadena de responsabilidad:

```text
Administrador Cierra
  -> crea y da acceso al estudio contable / contador
      -> el estudio crea y da acceso a sus empresas cliente
          -> la empresa crea y da acceso a sus empleados
```

Reglas:
- El administrador de Cierra es quien habilita un estudio nuevo y su usuario inicial.
- El estudio contable es quien carga/crea sus empresas cliente y les da acceso.
- La empresa es quien carga/crea sus empleados y les da acceso.
- Soporte de Cierra puede asistir, pero toda accion debe quedar auditada con actor, motivo y fecha.
- Nadie puede darse acceso a si mismo a un nivel superior.
- Las altas tambien deben respetar modulos contratados cuando corresponda.

## Regla de aislamiento
Cada registro de negocio debe tener una forma clara de llegar a su dueño.

Ejemplos:
- Una empresa pertenece a un estudio.
- Un empleado pertenece a una empresa.
- Una novedad pertenece a un empleado, a una empresa, a un periodo y a un estudio.
- Un recibo pertenece a un empleado, a una empresa, a un periodo y a un estudio.
- Una accion de auditoria registra actor, rol, estudio, empresa afectada y fecha.

## Roles iniciales

### Roles globales
- `system_admin`: administra toda la plataforma.
- `support_admin`: puede revisar y asistir, con permisos mas limitados y auditoria estricta.

### Roles del estudio
- `studio_owner`: dueño del estudio.
- `studio_admin`: administra usuarios, empresas y configuracion.
- `payroll_operator`: liquida sueldos y gestiona novedades.
- `studio_readonly`: ve informacion sin modificarla.

### Roles de empresa
- `company_owner`: contacto principal de la empresa.
- `company_operator`: carga novedades y revisa informacion operativa.
- `company_readonly`: solo consulta.

### Rol de empleado
- `employee_self`: accede solo a su informacion personal.

## Permisos por actor

| Accion | Admin sistema | Estudio | Empresa | Empleado |
|---|---:|---:|---:|---:|
| Ver todos los estudios | Si | No | No | No |
| Crear acceso a contador | Si | No | No | No |
| Ver empresas de un estudio | Si | Solo propias | No | No |
| Editar perfil de estudio | Si | Solo propio | No | No |
| Subir logo de estudio | Si | Solo propio | No | No |
| Crear empresa | Soporte auditado | Solo en su estudio | No | No |
| Crear acceso a empresa | Soporte auditado | Solo empresas propias | No | No |
| Editar perfil de empresa | Si | Solo propias | Solo propia y campos permitidos | No |
| Subir logo de empresa | Si | Solo propias | Solo propia | No |
| Ver empleados | Si | Solo empresas propias | Solo empresa propia | Solo si mismo |
| Crear empleado | Soporte auditado | No normalmente | Solo empresa propia | No |
| Crear acceso a empleado | Soporte auditado | No normalmente | Solo empresa propia | No |
| Editar empleado | Si | Solo empresas propias | Campos permitidos si aplica | Campos personales permitidos si aplica |
| Cargar novedades | Si | Solo empresas propias | Solo empresa propia | No, salvo flujo futuro |
| Calcular liquidacion | Si | Solo empresas propias | No | No |
| Aprobar liquidacion | No normalmente | No normalmente | Solo propia | No |
| Ver recibo | Si | Solo empresas propias | Solo empresa propia | Solo propio |
| Ver auditoria | Global | Solo su estudio | Solo su empresa si aplica | Solo eventos propios si aplica |

## Personalizacion de marca

### Estudio contable
Cada estudio puede tener:
- Nombre visible.
- Razon social.
- RUT.
- Logo.
- Foto o avatar del contador si es unipersonal.
- Color principal opcional, si mas adelante se habilita.
- Datos de contacto.
- Preferencia visual por usuario: modo claro, modo oscuro o seguir sistema.

Uso esperado:
- El estudio ve su identidad en el panel interno.
- Empresas y empleados pueden ver el nombre/logo del estudio cuando corresponda, por ejemplo en comunicaciones, pedidos de novedades o recibos.

### Empresa
Cada empresa puede tener:
- Nombre visible obligatorio.
- Razon social.
- RUT.
- Logo opcional.
- Contactos.
- Email principal.
- Telefono.
- Direccion.
- Preferencia visual por usuario: modo claro, modo oscuro o seguir sistema.

Uso esperado:
- La empresa ve su propio nombre y logo al entrar.
- Sus empleados ven el nombre/logo de la empresa en su portal y recibos.
- Si no hay logo, se muestran iniciales con un avatar prolijo.

### Empleado
Cada empleado puede tener:
- Nombre y apellido.
- Foto o avatar futuro, si se decide habilitar.
- Preferencia visual por usuario: modo claro, modo oscuro o seguir sistema.

## Modo claro y oscuro
El tema visual debe ser una preferencia por usuario, no por empresa completa.

Opciones:
- `light`: modo claro.
- `dark`: modo oscuro.
- `system`: usar preferencia del navegador o dispositivo.

Reglas:
- La preferencia se guarda en el perfil del usuario.
- Antes de iniciar sesion se usa `system` por defecto.
- Despues de iniciar sesion se aplica la preferencia guardada.
- El modo oscuro debe mantener contraste suficiente y no depender solo de color para comunicar estados.
- Logos subidos deben funcionar sobre fondos claros y oscuros. Si no, se puede mostrar sobre una superficie blanca controlada.

## Implicancias tecnicas

### Backend
El backend debe:
- Resolver el usuario autenticado en cada request.
- Construir un contexto de acceso con rol, estudio, empresa y empleado cuando aplique.
- Validar permisos antes de leer o escribir.
- Filtrar siempre por tenant.
- Registrar auditoria en escrituras y acciones sensibles.
- Devolver errores seguros: `401` si no inicio sesion, `403` si no tiene permiso, `404` si el recurso no existe o no le pertenece.

### Base de datos
Tablas esperadas a nivel conceptual:
- `users`
- `studies`
- `study_memberships`
- `companies`
- `company_memberships`
- `employees`
- `employee_accounts`
- `periods`
- `payroll_runs`
- `receipts`
- `audit_events`
- `brand_assets`
- `user_preferences`

Campos importantes:
- `study_id` en tablas de negocio.
- `company_id` cuando el dato pertenece a una empresa.
- `employee_id` cuando el dato pertenece a una persona.
- `created_by_user_id` y `updated_by_user_id` en datos sensibles.
- `created_by_actor_type` para distinguir altas hechas por admin, estudio, empresa o soporte.

### Frontend
El frontend debe:
- Mostrar pantallas distintas segun rol.
- No mostrar botones que el usuario no puede usar.
- Mostrar marca del estudio, empresa o empleado segun contexto.
- Permitir editar perfil, logo y preferencias cuando el rol lo permita.
- Ser mobile-first para empresas y empleados.
- Mantener una experiencia mas densa y operativa para estudios contables.

## Pantallas necesarias

### Publico / login
- Login principal.
- Recuperar contrasena.
- Seleccion de espacio si un usuario tiene mas de un rol o pertenece a mas de una organizacion.

### Admin sistema
- Dashboard global.
- Estudios.
- Usuarios.
- Empresas por estudio.
- Actividad global.
- Soporte y accesos.

### Estudio contable
- Dashboard del estudio.
- Empresas.
- Empleados.
- Liquidaciones.
- Documentos y recibos.
- Auditoria del estudio.
- Configuracion del estudio.
- Usuarios y permisos.
- Marca y apariencia.

### Empresa
- Dashboard de su empresa.
- Empleados.
- Carga de novedades.
- Liquidaciones para aprobar.
- Recibos/documentos publicados.
- Perfil de empresa.
- Marca y apariencia.

### Empleado
- Mis recibos.
- Mis datos.
- Mis documentos futuros.
- Preferencias de apariencia.

## Casos de abuso que deben fallar
- Un contador intenta abrir por URL una empresa de otro contador.
- Una empresa intenta abrir empleados de otra empresa.
- Un empleado cambia el ID en la URL para ver el recibo de otro empleado.
- Un usuario de solo lectura intenta guardar cambios.
- Un usuario suspendido intenta iniciar sesion.
- Un soporte/admin entra a datos de un cliente sin que quede auditoria.
- Una empresa intenta subir un archivo enorme o un logo con tipo no permitido.

## Criterios de aceptacion
- Cada actor inicia sesion y ve solo su espacio.
- Todo endpoint protegido valida rol y pertenencia.
- Los datos de un estudio no aparecen en consultas de otro estudio.
- Empresa y estudio pueden editar nombre visible y logo si tienen permiso.
- La UI muestra logo o iniciales segun disponibilidad.
- Cada usuario puede elegir claro, oscuro o sistema.
- La auditoria registra cambios de perfil, logos, accesos y acciones de negocio.
- Hay pruebas automaticas que demuestran que no se mezclan datos entre actores.
