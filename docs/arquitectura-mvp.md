# Arquitectura técnica del MVP

> Estado: **propuesta aprobada para arrancar**, 28/09/2026.
> Alcance: cómo pasar del prototipo actual (datos en el navegador) a un MVP con datos reales, desplegado en el VPS propio.
> Documentos relacionados: especificación funcional v1.0 y cambios v1.1, modelo de negocio (fuera de este repo, en `../docs/`).

---

## 1. Resumen

| Decisión | Elección |
|---|---|
| Aplicación | **Next.js + TypeScript**, la misma base del prototipo |
| Base de datos | **PostgreSQL** con aislamiento por estudio (**Row Level Security**) |
| Servidor | **VPS propio (Hostinger)** con **Coolify** para publicar, HTTPS y backups |
| Inicio de sesión | **Better Auth** (usuarios guardados en nuestra base) |
| Tareas en segundo plano | **pg-boss** (cola de tareas sobre el mismo Postgres) |
| Montos | **Centésimos enteros** en todo el sistema, nunca números decimales comunes |
| Motor de cálculo | Módulo TypeScript puro, validado con **casos dorados** de un contador asesor |
| Backups | Diario, cifrado, en **otro proveedor** (Cloudflare R2), con prueba mensual de restauración |
| Costo de infraestructura | El VPS que ya tenemos + dominios. Servicios externos en plan gratuito al inicio |

Principio rector: **una sola persona tiene que poder construirlo, operarlo y entenderlo**. Nada de microservicios, Kubernetes ni apps nativas en esta etapa.

---

## 2. Punto de partida: qué se reutiliza del prototipo

| Hoy en el prototipo | En el MVP |
|---|---|
| `src/lib/engine.ts` (motor) | Se mueve a `src/motor/`, se pasa a centésimos enteros y se le agregan casos dorados. La lógica se mantiene. |
| `src/lib/params.ts` (parámetros y laudos) | Pasa a tablas `parametros` y `laudos` con vigencia y fuente. Se cargan desde un panel de administración. |
| `src/lib/validations.ts` | Se reutiliza tal cual; recibe datos de la base en vez del store. |
| `src/lib/status.ts`, `labels.ts`, `format.ts` | Se reutilizan tal cual. |
| `src/lib/store.ts` (estado en el navegador) | **Se reemplaza** por funciones de servidor (Server Actions) que leen y escriben en Postgres. Es el cambio principal. |
| `src/lib/seed.ts` | Queda solo para el ambiente de pruebas y los tests. |
| Pantallas en `src/app/` y `src/components/` | Se reutilizan. Cambian de dónde sacan los datos, no cómo se ven. |
| `src/lib/bps.ts` (archivo de ejemplo) | Se reemplaza por el formato real de BPS en la etapa C. |

---

## 3. Opciones evaluadas y por qué el VPS

| Opción | A favor | En contra | Veredicto |
|---|---|---|---|
| **Vercel + Supabase** | Cero mantenimiento de servidores; Postgres con RLS, auth y archivos incluidos | ~USD 45–50/mes; dos proveedores externos | Buena, pero pagamos algo que ya tenemos |
| **Hostinger Business (Node.js + MySQL)** | Ya pago; app y base juntas | MySQL no tiene Row Level Security; triggers y permisos limitados en hosting compartido; recursos compartidos | Aceptable para un piloto, débil para datos de sueldos |
| **VPS propio** | Ya pago; control total; **Postgres con RLS**; procesos en segundo plano sin límites | El mantenimiento del servidor es nuestro | **Elegida.** El mantenimiento se automatiza con Coolify y la lista de la sección 12 |

El plan Business queda disponible para la web comercial, el email del dominio o demos.

---

## 4. Arquitectura

```
                         Internet
                            │
                     HTTPS (443)
                            │
┌───────────────────────── VPS · Ubuntu 24.04 ─────────────────────────┐
│  Coolify (panel de despliegue)                                       │
│  └─ Proxy (Traefik): HTTPS automático con Let's Encrypt              │
│      ├─ app.dominio.uy      → contenedor "web" (Next.js, producción) │
│      └─ pruebas.dominio.uy  → contenedor "web" (Next.js, pruebas)    │
│                                                                      │
│  Contenedor "worker" (mismo código, otro comando)                    │
│      └─ pg-boss: recordatorios, PDFs masivos, emails, backups        │
│                                                                      │
│  PostgreSQL 17 (una base por ambiente)  ← sin puerto público         │
│  Volumen de archivos (adjuntos, logos)                               │
└──────────────────────────────────────────────────────────────────────┘
          │                         │                        │
   Backup diario cifrado      Emails (Resend)        Errores (Sentry)
   → Cloudflare R2
```

### Procesos

| Proceso | Qué hace | Por qué separado |
|---|---|---|
| **web** | Pantallas del estudio, portal cliente, portal empleado, API | Tiene que responder rápido siempre |
| **worker** | Genera recibos en lote, manda emails y recordatorios, exporta backups | Cerrar un mes con 200 recibos no puede frenar a los demás usuarios |
| **postgres** | Datos, cola de tareas (pg-boss) y sesiones | Una sola fuente de verdad; menos piezas |

`web` y `worker` salen del mismo repositorio y la misma imagen. Solo cambia el comando de arranque (`node server.js` o `node worker.js`).

---

## 5. Stack detallado y motivos

| Pieza | Tecnología | Motivo |
|---|---|---|
| Lenguaje | **TypeScript** estricto | El prototipo ya lo usa; los tipos atrapan errores de cálculo y de datos antes de producción |
| Framework | **Next.js (App Router)** en modo `standalone` | Un solo proyecto para los tres portales; el modo standalone genera un servidor Node liviano que corre en un contenedor |
| Base de datos | **PostgreSQL 17** | Relacional (empresas → empleados → meses → versiones); Row Level Security para aislar estudios; permisos finos para auditoría inmutable; `numeric` y enteros grandes para dinero |
| Acceso a datos | **Drizzle ORM** + `postgres.js` | Consultas con tipos, migraciones versionadas en el repo; SQL visible, útil para auditar |
| Validación | **Zod** | Las mismas reglas en formularios y servidor (novedades, importador, fichas) |
| Autenticación | **Better Auth** | Librería gratuita; usuarios y sesiones en nuestra propia base; soporta contraseña + segundo factor (TOTP), links de acceso por email y códigos de un solo uso |
| UI | **Tailwind CSS 4** (ya está) + **shadcn/ui** | shadcn aporta diálogos, menús y formularios accesibles (Radix) sin imponer estilo |
| Formularios | **React Hook Form** + Zod | Formularios largos (ficha de empleado, empresa) con validación en vivo |
| Tareas en segundo plano | **pg-boss** | Cola sobre Postgres: reintentos, tareas programadas, sin sumar Redis |
| Recibos PDF | **@react-pdf/renderer** | PDFs reales en el servidor, sin navegador; reutiliza componentes de React |
| Excel | **SheetJS** (ya está) | Importar empleados y novedades; exportar reportes |
| Emails | **Resend** + **React Email** | Buena entrega (no cae en spam como un SMTP de hosting); 3.000 emails/mes gratis |
| WhatsApp | Links `wa.me` → luego **WhatsApp Cloud API** (Meta) | El link es gratis para validar; la API cobra por conversación y se suma cuando se demuestre uso |
| Dinero | **Enteros en centésimos** (`bigint`) + utilidades propias | Evita errores de redondeo de los decimales de JavaScript (0,1 + 0,2 ≠ 0,3) |
| Pruebas | **Vitest** (motor, reglas, aislamiento) + **Playwright** (recorridos completos) | Playwright ya se usó para validar el prototipo |
| Errores | **Sentry** (plan gratuito) | Aviso inmediato de errores, con datos sensibles filtrados |
| Disponibilidad | **Uptime Kuma** en el VPS | Avisa por email/Telegram si la app deja de responder |
| Despliegue | **Coolify** + **GitHub** | Publica al subir cambios, HTTPS, variables de entorno, backups programados, logs |
| CI | **GitHub Actions** | Lint, tipos y pruebas antes de publicar |

### Qué evitamos a propósito

- **Backend separado** (NestJS, Django): duplica modelos y despliegues sin beneficio para un equipo chico.
- **MySQL**: no tiene Row Level Security.
- **Redis / colas externas**: pg-boss alcanza para este volumen.
- **App nativa**: el portal del empleado es web adaptada al celular e instalable (PWA).
- **Kubernetes / microservicios**: complejidad operativa sin necesidad.

---

## 6. Modelo de datos

Todas las tablas de negocio llevan `estudio_id` (salvo `estudios` y las tablas normativas globales). Los montos son `bigint` en centésimos. Las fechas con hora son `timestamptz`.

### Identidad y acceso

| Tabla | Campos clave | Notas |
|---|---|---|
| `estudios` | id, nombre, plan, creado | Un tenant por estudio contable |
| `usuarios` | id, email, nombre, mfa_activo | Gestionada por Better Auth (más tablas `sesiones`, `cuentas`, `verificaciones`) |
| `membresias` | usuario_id, estudio_id, rol (`admin` \| `liquidador` \| `lectura`) | Un usuario puede pertenecer a más de un estudio |
| `membresia_empresas` | membresia_id, empresa_id | Si está vacía: acceso a todas. Si tiene filas: solo a esas (RF-003) |
| `contactos_cliente` | id, estudio_id, empresa_id, nombre, email, telefono | Acceso al portal cliente por link o código |
| `accesos_empleado` | empleado_id, email, telefono, ultimo_acceso | Acceso al portal empleado por código de un solo uso |

### Empresas y personas

| Tabla | Campos clave |
|---|---|
| `empresas` | id, estudio_id, nombre, rut, nro_bps, actividad, grupo, subgrupo, responsable_id, requiere_aprobacion, logo_archivo_id, activa |
| `empleados` | id, estudio_id, empresa_id, nombre, apellido, ci, email, cargo, modalidad, cuenta_cobro |
| `relaciones_laborales` | id, empleado_id, ingreso, egreso, motivo_egreso | Permite reingresos sin perder historia (RF-022) |
| `empleado_vigencias` | id, empleado_id, desde, sueldo_base_cent, categoria, horario, hijos, conyuge_fonasa | Cada cambio es una fila nueva con vigencia (RF-021) |

### Parámetros normativos (globales, sin `estudio_id`)

| Tabla | Campos clave |
|---|---|
| `parametros` | id, codigo (`UY-2026-07`), vigencia_desde, vigencia_hasta, valores (jsonb validado con Zod), fuente, cargado_por |
| `laudos` | id, grupo, subgrupo, categoria, minimo_cent, vigencia_desde, fuente |

### Ciclo mensual

| Tabla | Campos clave | Notas |
|---|---|---|
| `periodos` | id, estudio_id, empresa_id, mes, etapa, fecha_objetivo, sin_novedades, bps_estado | Único por (empresa, mes) (RF-030) |
| `solicitudes_novedades` | id, periodo_id, enviada, abierta, respondida, canal | Historial de pedidos y reenvíos |
| `novedades` | id, estudio_id, periodo_id, empleado_id, tipo, cantidad, importe_cent, nota, origen, autor_id, creada | Toda edición queda en auditoría (RF-035) |
| `adjuntos` | id, estudio_id, entidad, entidad_id, archivo_ruta, nombre, tipo, tamano, sha256 | Certificados, logos, comprobantes BPS |
| `liquidaciones` | id, estudio_id, periodo_id, version, estado, motor_version, parametros_codigo, entradas_hash, resultado_hash, creada_por, creada | **Inmutable** una vez creada (RN-02) |
| `liquidacion_lineas` | liquidacion_id, empleado_id, codigo, concepto, tipo, gravado_bps, base_cent, cantidad, tasa, importe_cent, formula, parametros_usados | La explicación de cada línea queda guardada |
| `aprobaciones` | id, liquidacion_id, estado, comentario, actor, fecha | Una aprobación por versión (RN-05) |
| `advertencias_aceptadas` | periodo_id, alerta_codigo, nota, usuario_id, fecha | (RF-054) |
| `cierres` | periodo_id, liquidacion_id, cerrado_por, fecha | |
| `rectificaciones` | id, periodo_id, desde_version, motivo, usuario_id, fecha | (RF-082) |
| `recibos` | id, liquidacion_id, empleado_id, publicado, sha256 | El PDF se regenera desde la versión cerrada; el hash prueba que no cambió |
| `recibo_vistas` | recibo_id, fecha, ip_hash | Constancia de visualización |
| `exportaciones_bps` | id, periodo_id, archivo_id, estado, presentado_por, fecha | |

### Auditoría

| Tabla | Campos clave | Notas |
|---|---|---|
| `auditoria` | id, estudio_id, actor_tipo, actor_id, entidad, entidad_id, accion, antes (jsonb), despues (jsonb), ip_hash, fecha | Solo inserción: el rol de la app no tiene `UPDATE` ni `DELETE` (RNF-05) |

---

## 7. Aislamiento entre estudios (multi-tenant)

Es la protección más importante del sistema. Se aplica en **dos capas**.

### Capa 1: base de datos (Row Level Security)

1. Cada tabla de negocio tiene `estudio_id` y RLS activado.
2. La app se conecta con un rol `app_user` **sin** `BYPASSRLS` y que no es dueño de las tablas.
3. Al inicio de cada request, dentro de una transacción:
   ```sql
   SET LOCAL app.estudio_id = '<id del estudio de la sesión>';
   ```
4. Cada tabla tiene una política:
   ```sql
   CREATE POLICY aislamiento ON empleados
     USING (estudio_id = current_setting('app.estudio_id')::uuid)
     WITH CHECK (estudio_id = current_setting('app.estudio_id')::uuid);
   ```
5. Si falta `app.estudio_id`, la consulta falla. **Nunca devuelve datos de todos.**

### Capa 2: aplicación

- Todo acceso a datos pasa por `src/datos/`, con una función `conEstudio(sesion, fn)` que abre la transacción y fija el estudio.
- Los permisos por rol y por empresa (RF-002, RF-003) se validan en el servidor, nunca solo en la pantalla (RNF-03).
- Portal cliente y portal empleado usan sesiones propias que además restringen a **una empresa** o a **un empleado**.

### Pruebas obligatorias

- Crear dos estudios con datos; con la sesión del estudio A, intentar leer, editar y borrar datos de B por cada tabla y cada ruta. **Todas deben fallar.**
- Un empleado intenta abrir el recibo de otro cambiando la URL. **Debe fallar.**
- Estas pruebas corren en cada cambio (CI) y bloquean la publicación.

---

## 8. Autenticación y roles

| Quién | Cómo entra | Qué ve |
|---|---|---|
| **Estudio** (admin, liquidador, solo lectura) | Email + contraseña + segundo factor (TOTP). El admin puede exigir segundo factor a todo el estudio (RF-004) | Su estudio; si tiene empresas asignadas, solo esas |
| **Cliente** (contacto de la empresa) | Link de acceso enviado por email (sin contraseña), válido por tiempo limitado | Solo su empresa: novedades y aprobación |
| **Empleado** | Cédula + código de un solo uso por email o WhatsApp | Solo sus recibos y datos |

- Sesiones con vencimiento y cierre en todos los dispositivos.
- Límite de intentos en inicio de sesión y códigos.
- Toda acción sensible queda en `auditoria` con el tipo de actor.

---

## 9. Motor de cálculo

### Reglas

1. **Determinista:** mismas entradas + misma versión de parámetros + misma versión del motor = mismo resultado, siempre (sección 19 de la spec).
2. **Sin base de datos ni pantallas:** recibe datos, devuelve líneas. Se prueba aislado.
3. **Todo en centésimos enteros.** Cada concepto define cuándo redondea (por ejemplo: jornal sin redondear, importe de línea redondeado a centésimo, "half-up"). La política de redondeo se valida con el contador asesor y se documenta en el propio módulo.
4. **Versionado:** `MOTOR_VERSION` se guarda con cada liquidación. Un cambio de fórmula sube la versión; las liquidaciones cerradas no se recalculan.
5. **Bloquear, no estimar** (RN-04): lo fuera de alcance devuelve un motivo, nunca un número.

### Casos dorados

- Un contador asesor arma **30 a 50 liquidaciones reales anonimizadas** con su resultado correcto al centésimo: mensual simple, con hijos, con cónyuge, horas extra, faltas, licencia, aguinaldo, ingreso a mitad de mes, IRPF en cada franja, tope jubilatorio.
- Se guardan en `src/motor/__casos__/*.json` (entrada + salida esperada).
- Vitest verifica en cada cambio que el motor los reproduce exactamente. Si un caso falla, no se publica.

### Integridad

- `entradas_hash` y `resultado_hash` con **SHA-256** (el prototipo usa un hash simple de demostración).
- El recibo muestra la huella y permite verificar que coincide con la versión cerrada (RNF-13).

---

## 10. Tareas en segundo plano (pg-boss)

| Cola | Disparador | Qué hace |
|---|---|---|
| `recibos.generar` | Al cerrar un período | Genera y guarda el hash de cada recibo; avisa a cada empleado |
| `recibos.lote` | "Todos en PDF" | Arma un PDF único con todos los recibos de la empresa |
| `email.enviar` | Cualquier aviso | Envío con reintentos |
| `recordatorios.novedades` | Todos los días 9:00 | Recuerda a empresas sin enviar novedades cerca de la fecha límite |
| `recordatorios.aprobacion` | Todos los días 9:00 | Recuerda aprobaciones pendientes hace más de 2 días |
| `vencimientos.aviso` | Todos los días 8:00 | Avisa al estudio vencimientos de la semana (BPS, pago, aguinaldo) |
| `backup.base` | Todos los días 3:00 | Ver sección 13 |

Cada tarea es idempotente: si se reintenta, no duplica emails ni recibos.

---

## 11. Infraestructura en el VPS

### Requisitos del servidor

| Recurso | Mínimo piloto | Recomendado |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disco | 40 GB SSD | 80 GB SSD |
| Sistema | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Ubicación | La más cercana a Uruguay disponible (idealmente São Paulo) | |

> **Pendiente:** confirmar especificaciones y ubicación del VPS actual (ver sección 18).

### Ambientes

| Ambiente | Dominio | Base | Se publica desde |
|---|---|---|---|
| Producción | `app.dominio.uy` | `cierra_prod` | Rama `main` |
| Pruebas | `pruebas.dominio.uy` | `cierra_pruebas` (datos de ejemplo) | Rama `pruebas` |
| Demo actual | `cierra-prototipo.vercel.app` | Navegador del usuario | Se mantiene mientras se valida con contadores |

### Variables de entorno

Se cargan en Coolify. **Nunca en el repositorio.**

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión con el rol `app_user` |
| `DATABASE_URL_MIGRACIONES` | Rol dueño de las tablas, solo para migraciones |
| `BETTER_AUTH_SECRET` | Firma de sesiones |
| `BETTER_AUTH_URL` | URL pública del ambiente |
| `RESEND_API_KEY` | Emails |
| `SENTRY_DSN` | Errores |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Backups |
| `BACKUP_CLAVE_PUBLICA` | Cifrado de backups (la clave privada no vive en el servidor) |
| `ARCHIVOS_DIR` | Carpeta del volumen de adjuntos |

### Instalación inicial (una sola vez)

```bash
# 1. Usuario sin privilegios de root y acceso solo por llave SSH
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
# En /etc/ssh/sshd_config: PasswordAuthentication no · PermitRootLogin no
systemctl restart ssh

# 2. Firewall: solo SSH, HTTP y HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# 3. Bloqueo de intentos repetidos y actualizaciones automáticas de seguridad
apt update && apt install -y fail2ban unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 4. Coolify (instalador oficial)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Después, desde el panel de Coolify:

1. Crear el proyecto y los dos ambientes (producción y pruebas).
2. Agregar PostgreSQL 17 por ambiente, **sin puerto público**.
3. Conectar el repositorio de GitHub y crear los servicios `web` y `worker`.
4. Cargar variables de entorno.
5. Configurar dominios; Coolify emite el certificado HTTPS.
6. Cerrar el puerto del panel de Coolify al público o protegerlo con un subdominio y segundo factor.

---

## 12. Seguridad

### Servidor

- [ ] Acceso SSH solo con llave, sin root.
- [ ] Firewall: 22, 80, 443. Postgres y panel de Coolify no expuestos.
- [ ] Fail2ban activo.
- [ ] Actualizaciones de seguridad automáticas.
- [ ] Uptime Kuma avisando caídas.

### Aplicación

- [ ] RLS en todas las tablas de negocio + pruebas de aislamiento (sección 7).
- [ ] Rol de base de la app sin `BYPASSRLS`, sin `UPDATE`/`DELETE` en `auditoria`, `liquidaciones` y `liquidacion_lineas`.
- [ ] Segundo factor para el estudio; exigible por el admin.
- [ ] Límite de intentos en inicio de sesión y códigos.
- [ ] Cabeceras de seguridad (CSP, HSTS, X-Frame-Options).
- [ ] Adjuntos servidos solo por una ruta que valida permisos; nunca desde una carpeta pública.
- [ ] Logs y Sentry **sin** sueldos, cédulas ni cuentas bancarias.
- [ ] Emails sin importes en el asunto (RF-074).
- [ ] Dependencias revisadas automáticamente (Dependabot).

### Protección de datos (Ley 18.331)

- [ ] **Consulta con abogado** sobre la ubicación del servidor y la transferencia internacional de datos.
- [ ] Política de privacidad y términos para estudios, clientes y empleados.
- [ ] Contrato con cada estudio que defina roles (el estudio es responsable; nosotros, encargados del tratamiento).
- [ ] Registro de la base ante la URCDP, si corresponde.
- [ ] Procedimiento para pedidos de acceso, rectificación y supresión.
- [ ] Política de conservación de recibos según el plazo legal aplicable.

---

## 13. Backups y recuperación

| Qué | Cómo | Frecuencia | Retención |
|---|---|---|---|
| Base de datos | `pg_dump` en formato comprimido → cifrado con clave pública (`age`) → Cloudflare R2 | Diario 3:00 | 30 diarios + 12 mensuales |
| Archivos (adjuntos, logos) | Sincronización cifrada del volumen a R2 | Diario | Igual que la base |
| Configuración de Coolify | Backup propio de Coolify a R2 | Semanal | 8 semanas |

- **Objetivo de pérdida máxima (RPO):** 24 horas. Si hace falta menos, activar respaldo continuo con WAL (pgBackRest) más adelante.
- **Objetivo de recuperación (RTO):** 4 horas para levantar un VPS nuevo desde cero.
- **Prueba de restauración mensual** en el ambiente de pruebas, anotando fecha y resultado. Un backup que nunca se restauró no cuenta.
- La **clave privada** para descifrar backups se guarda fuera del servidor (gestor de contraseñas del equipo).

---

## 14. Publicación y control de calidad

```
rama de trabajo ──PR──► GitHub Actions ──ok──► merge a "pruebas" ──► Coolify publica en pruebas
                         · lint                                         │
                         · tipos                                        ▼
                         · Vitest (motor + aislamiento)          revisión manual
                         · Playwright (recorridos)                      │
                                                                        ▼
                                              merge a "main" ──► Coolify publica en producción
```

- Las migraciones de base corren automáticamente antes de arrancar la nueva versión.
- Si una migración falla, la versión anterior sigue funcionando.
- Publicaciones en producción fuera de los **primeros 5 días hábiles del mes** (temporada de cierre), salvo correcciones urgentes.

---

## 15. Costos estimados

| Rubro | Costo mensual |
|---|---|
| VPS Hostinger | Ya contratado |
| Dominio `.uy` / `.com.uy` | Anual, bajo |
| Coolify, Postgres, pg-boss, Uptime Kuma | USD 0 (software libre en el VPS) |
| Cloudflare R2 | USD 0 hasta 10 GB |
| Resend | USD 0 hasta 3.000 emails/mes |
| Sentry | USD 0 (plan gratuito) |
| **Total adicional al arrancar** | **≈ USD 0** |

Cuándo empieza a costar: más de 3.000 emails por mes (Resend, ~USD 20), WhatsApp Cloud API (por conversación), más de 10 GB de backups, o un VPS más grande. El costo real sigue siendo el contador asesor y el soporte (ver modelo de negocio).

---

## 16. Estructura del repositorio

```
src/
  app/                  pantallas (se mantienen del prototipo)
  components/           componentes de UI
  motor/                motor de cálculo puro
    __casos__/          casos dorados (entrada + salida esperada)
  datos/                acceso a base: esquema Drizzle, conEstudio(), consultas
    esquema/
    migraciones/
  acciones/             Server Actions por módulo (novedades, liquidación, cierre…)
  auth/                 configuración de Better Auth y permisos
  tareas/               definiciones de colas pg-boss
  pdf/                  plantillas de recibos
  emails/               plantillas React Email
  lib/                  utilidades compartidas (formato, estados, validaciones)
worker.ts               arranque del proceso de tareas
docs/                   este documento y decisiones técnicas
tests/
  aislamiento/          pruebas entre estudios
  e2e/                  Playwright
```

---

## 17. Plan de implementación

Estimación orientativa para una persona a tiempo completo. Se ajusta después de la semana 1.

| Semana | Entregable | Etapa del negocio |
|---|---|---|
| 1 | VPS asegurado, Coolify, Postgres, ambientes, CI. Esquema de base inicial, RLS y pruebas de aislamiento | Base |
| 2 | Better Auth: estudio (con segundo factor), cliente (link) y empleado (código). Roles y permisos por empresa | Base |
| 3 | Empresas, empleados con vigencias, importador Excel contra la base. Auditoría | A |
| 4 | Períodos, novedades, portal cliente, pedidos y recordatorios por email, links de WhatsApp | A |
| 5 | Tablero, checklist, aprobación del cliente, vencimientos. **Piloto etapa A con 1–2 estudios** | A |
| 6 | Importar resultados de otro sistema (PDF/planilla), portal empleado, recibos PDF, constancia de visualización | B |
| 7 | Backups probados, Sentry, Uptime Kuma, endurecimiento de seguridad, política de privacidad | B |
| 8+ | Motor en centésimos con casos dorados, versiones, rectificaciones, exportación BPS real | C |

---

## 18. Pendientes y preguntas abiertas

| Tema | Responsable | Estado |
|---|---|---|
| Especificaciones del VPS (CPU, RAM, disco) | Equipo | Pendiente |
| Ubicación del VPS | Equipo | Pendiente |
| ¿El VPS tiene otros servicios corriendo? | Equipo | Pendiente |
| Dominio definitivo | Equipo | Pendiente |
| Consulta legal Ley 18.331 (ubicación de datos, contratos) | Abogado | Pendiente |
| Contador asesor para parámetros, laudos y casos dorados | Equipo | Pendiente |
| Política de redondeo por concepto | Contador asesor | Pendiente |
| Formato real de archivo BPS | Contador asesor + desarrollo | Etapa C |
