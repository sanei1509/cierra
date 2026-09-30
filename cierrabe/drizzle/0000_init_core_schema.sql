CREATE TYPE "public"."bps_estado" AS ENUM('pendiente', 'generado', 'presentado');--> statement-breakpoint
CREATE TYPE "public"."etapa_periodo" AS ENUM('novedades', 'recibidas', 'borrador', 'enviada', 'devuelta', 'aprobada', 'cerrada');--> statement-breakpoint
CREATE TYPE "public"."modalidad" AS ENUM('mensual', 'jornalero');--> statement-breakpoint
CREATE TYPE "public"."origen_novedad" AS ENUM('cliente', 'estudio');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('admin', 'liquidador', 'lectura');--> statement-breakpoint
CREATE TYPE "public"."tipo_novedad" AS ENUM('hora_extra', 'falta', 'licencia', 'bono', 'adelanto', 'cambio_salarial', 'llegada_tarde', 'feriado', 'certificacion');--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"actor_tipo" text DEFAULT 'usuario' NOT NULL,
	"actor_id" uuid,
	"empresa_id" uuid,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"accion" text NOT NULL,
	"detalle" text,
	"antes" jsonb,
	"despues" jsonb,
	"ip_hash" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empleado_vigencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"desde" timestamp NOT NULL,
	"sueldo_base_cent" integer NOT NULL,
	"categoria" text NOT NULL,
	"horario" text,
	"hijos" integer DEFAULT 0 NOT NULL,
	"conyuge_fonasa" boolean DEFAULT false NOT NULL,
	"licencia_disponible" integer,
	"licencia_tomada" integer
);
--> statement-breakpoint
CREATE TABLE "empleados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"ci" varchar(20) NOT NULL,
	"email" text,
	"telefono" text,
	"direccion" text,
	"cargo" text NOT NULL,
	"area" text,
	"categoria" text NOT NULL,
	"modalidad" "modalidad" NOT NULL,
	"tipo_contrato" text,
	"cuenta_cobro" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"rut" varchar(20) NOT NULL,
	"nro_bps" text NOT NULL,
	"actividad" text NOT NULL,
	"grupo" integer NOT NULL,
	"subgrupo" text NOT NULL,
	"responsable_id" uuid,
	"requiere_aprobacion" boolean DEFAULT true NOT NULL,
	"contacto_nombre" text NOT NULL,
	"contacto_email" text NOT NULL,
	"logo_archivo_id" uuid,
	"activa" boolean DEFAULT true NOT NULL,
	"creada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estudios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"ciudad" text,
	"plan" text DEFAULT 'piloto' NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membresia_empresas" (
	"membresia_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	CONSTRAINT "membresia_empresas_membresia_id_empresa_id_pk" PRIMARY KEY("membresia_id","empresa_id")
);
--> statement-breakpoint
CREATE TABLE "membresias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"estudio_id" uuid NOT NULL,
	"rol" "rol" NOT NULL,
	"creada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "novedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"periodo_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"tipo" "tipo_novedad" NOT NULL,
	"cantidad" integer,
	"importe_cent" integer,
	"nota" text,
	"adjunto" jsonb,
	"origen" "origen_novedad" NOT NULL,
	"autor" text NOT NULL,
	"creada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"mes" varchar(7) NOT NULL,
	"etapa" "etapa_periodo" DEFAULT 'novedades' NOT NULL,
	"fecha_objetivo" timestamp NOT NULL,
	"sin_novedades" boolean DEFAULT false NOT NULL,
	"bps_estado" "bps_estado" DEFAULT 'pendiente' NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relaciones_laborales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"ingreso" timestamp NOT NULL,
	"egreso" timestamp,
	"motivo_egreso" text
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"mfa_activo" boolean DEFAULT false NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleado_vigencias" ADD CONSTRAINT "empleado_vigencias_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleado_vigencias" ADD CONSTRAINT "empleado_vigencias_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membresia_empresas" ADD CONSTRAINT "membresia_empresas_membresia_id_membresias_id_fk" FOREIGN KEY ("membresia_id") REFERENCES "public"."membresias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membresia_empresas" ADD CONSTRAINT "membresia_empresas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novedades" ADD CONSTRAINT "novedades_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relaciones_laborales" ADD CONSTRAINT "relaciones_laborales_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relaciones_laborales" ADD CONSTRAINT "relaciones_laborales_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_estudio_fecha_idx" ON "auditoria" USING btree ("estudio_id","fecha");--> statement-breakpoint
CREATE INDEX "auditoria_empresa_idx" ON "auditoria" USING btree ("estudio_id","empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "empleado_vigencias_empleado_desde_unique" ON "empleado_vigencias" USING btree ("empleado_id","desde");--> statement-breakpoint
CREATE INDEX "empleado_vigencias_estudio_idx" ON "empleado_vigencias" USING btree ("estudio_id");--> statement-breakpoint
CREATE UNIQUE INDEX "empleados_estudio_ci_unique" ON "empleados" USING btree ("estudio_id","ci");--> statement-breakpoint
CREATE INDEX "empleados_estudio_empresa_idx" ON "empleados" USING btree ("estudio_id","empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "empresas_estudio_rut_unique" ON "empresas" USING btree ("estudio_id","rut");--> statement-breakpoint
CREATE INDEX "empresas_estudio_idx" ON "empresas" USING btree ("estudio_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membresias_usuario_estudio_unique" ON "membresias" USING btree ("usuario_id","estudio_id");--> statement-breakpoint
CREATE INDEX "membresias_estudio_idx" ON "membresias" USING btree ("estudio_id");--> statement-breakpoint
CREATE INDEX "novedades_periodo_idx" ON "novedades" USING btree ("estudio_id","periodo_id");--> statement-breakpoint
CREATE INDEX "novedades_empleado_idx" ON "novedades" USING btree ("estudio_id","empleado_id");--> statement-breakpoint
CREATE UNIQUE INDEX "periodos_empresa_mes_unique" ON "periodos" USING btree ("empresa_id","mes");--> statement-breakpoint
CREATE INDEX "periodos_estudio_idx" ON "periodos" USING btree ("estudio_id");--> statement-breakpoint
CREATE INDEX "relaciones_empleado_idx" ON "relaciones_laborales" USING btree ("estudio_id","empleado_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unique" ON "usuarios" USING btree ("email");--> statement-breakpoint
ALTER TABLE "estudios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "membresias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empleados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "relaciones_laborales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empleado_vigencias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "periodos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "novedades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auditoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "estudios_aislamiento" ON "estudios" FOR ALL USING ("id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "membresias_aislamiento" ON "membresias" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "empresas_aislamiento" ON "empresas" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "empleados_aislamiento" ON "empleados" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "relaciones_laborales_aislamiento" ON "relaciones_laborales" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "empleado_vigencias_aislamiento" ON "empleado_vigencias" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "periodos_aislamiento" ON "periodos" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "novedades_aislamiento" ON "novedades" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "auditoria_aislamiento" ON "auditoria" FOR ALL USING ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid) WITH CHECK ("estudio_id" = nullif(current_setting('app.estudio_id', true), '')::uuid);
