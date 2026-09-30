CREATE TYPE "public"."estado_plan" AS ENUM('activo', 'oculto', 'discontinuado');--> statement-breakpoint
CREATE TYPE "public"."estado_suscripcion" AS ENUM('prueba', 'activo', 'pausado', 'cancelado', 'vencido');--> statement-breakpoint
CREATE TYPE "public"."moneda" AS ENUM('UYU', 'USD');--> statement-breakpoint
CREATE TYPE "public"."tipo_override_modulo" AS ENUM('habilitar', 'deshabilitar');--> statement-breakpoint
CREATE TABLE "modulo_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"suscripcion_id" uuid NOT NULL,
	"modulo_codigo" varchar(80) NOT NULL,
	"tipo" "tipo_override_modulo" NOT NULL,
	"motivo" text NOT NULL,
	"inicio" timestamp NOT NULL,
	"fin" timestamp,
	"creado_por_usuario_id" uuid,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_modulos" (
	"plan_id" uuid NOT NULL,
	"modulo_codigo" varchar(80) NOT NULL,
	CONSTRAINT "plan_modulos_plan_id_modulo_codigo_pk" PRIMARY KEY("plan_id","modulo_codigo")
);
--> statement-breakpoint
CREATE TABLE "planes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(80) NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "estado_plan" DEFAULT 'activo' NOT NULL,
	"moneda" "moneda" DEFAULT 'UYU' NOT NULL,
	"precio_mensual_cent" integer DEFAULT 0 NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suscripcion_addons" (
	"suscripcion_id" uuid NOT NULL,
	"modulo_codigo" varchar(80) NOT NULL,
	"precio_mensual_cent" integer DEFAULT 0 NOT NULL,
	"inicio" timestamp NOT NULL,
	"fin" timestamp,
	CONSTRAINT "suscripcion_addons_suscripcion_id_modulo_codigo_pk" PRIMARY KEY("suscripcion_id","modulo_codigo")
);
--> statement-breakpoint
CREATE TABLE "suscripciones_estudio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"estado" "estado_suscripcion" DEFAULT 'prueba' NOT NULL,
	"moneda" "moneda" DEFAULT 'UYU' NOT NULL,
	"precio_mensual_cent" integer DEFAULT 0 NOT NULL,
	"inicio" timestamp NOT NULL,
	"fin" timestamp,
	"notas_internas" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modulo_overrides" ADD CONSTRAINT "modulo_overrides_suscripcion_id_suscripciones_estudio_id_fk" FOREIGN KEY ("suscripcion_id") REFERENCES "public"."suscripciones_estudio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo_overrides" ADD CONSTRAINT "modulo_overrides_modulo_codigo_modulos_codigo_fk" FOREIGN KEY ("modulo_codigo") REFERENCES "public"."modulos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo_overrides" ADD CONSTRAINT "modulo_overrides_creado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("creado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_modulos" ADD CONSTRAINT "plan_modulos_plan_id_planes_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."planes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_modulos" ADD CONSTRAINT "plan_modulos_modulo_codigo_modulos_codigo_fk" FOREIGN KEY ("modulo_codigo") REFERENCES "public"."modulos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscripcion_addons" ADD CONSTRAINT "suscripcion_addons_suscripcion_id_suscripciones_estudio_id_fk" FOREIGN KEY ("suscripcion_id") REFERENCES "public"."suscripciones_estudio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscripcion_addons" ADD CONSTRAINT "suscripcion_addons_modulo_codigo_modulos_codigo_fk" FOREIGN KEY ("modulo_codigo") REFERENCES "public"."modulos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscripciones_estudio" ADD CONSTRAINT "suscripciones_estudio_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscripciones_estudio" ADD CONSTRAINT "suscripciones_estudio_plan_id_planes_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."planes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "modulo_overrides_suscripcion_idx" ON "modulo_overrides" USING btree ("suscripcion_id","modulo_codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "planes_codigo_unique" ON "planes" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "suscripciones_estudio_idx" ON "suscripciones_estudio" USING btree ("estudio_id","estado");