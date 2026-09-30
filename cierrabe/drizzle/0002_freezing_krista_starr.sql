CREATE TYPE "public"."dueno_archivo_marca" AS ENUM('estudio', 'empresa', 'empleado');--> statement-breakpoint
CREATE TYPE "public"."tipo_archivo_marca" AS ENUM('logo', 'foto');--> statement-breakpoint
CREATE TABLE "archivos_marca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"empresa_id" uuid,
	"empleado_id" uuid,
	"dueno_tipo" "dueno_archivo_marca" NOT NULL,
	"tipo" "tipo_archivo_marca" NOT NULL,
	"nombre_original" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"checksum_sha256" text,
	"creado_por_usuario_id" uuid,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "nombre_visible" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "razon_social" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "contacto_telefono" text;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "direccion" text;--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "nombre_visible" text;--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "razon_social" text;--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "rut" varchar(20);--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "email_contacto" text;--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "logo_archivo_id" uuid;--> statement-breakpoint
ALTER TABLE "estudios" ADD COLUMN "foto_archivo_id" uuid;--> statement-breakpoint
ALTER TABLE "archivos_marca" ADD CONSTRAINT "archivos_marca_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivos_marca" ADD CONSTRAINT "archivos_marca_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivos_marca" ADD CONSTRAINT "archivos_marca_creado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("creado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archivos_marca_estudio_idx" ON "archivos_marca" USING btree ("estudio_id");--> statement-breakpoint
CREATE INDEX "archivos_marca_empresa_idx" ON "archivos_marca" USING btree ("estudio_id","empresa_id");