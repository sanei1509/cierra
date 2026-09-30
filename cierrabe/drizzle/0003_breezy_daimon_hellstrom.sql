CREATE TYPE "public"."alcance_modulo" AS ENUM('sistema', 'estudio', 'empresa', 'empleado');--> statement-breakpoint
CREATE TYPE "public"."estado_modulo" AS ENUM('activo', 'oculto', 'beta', 'discontinuado');--> statement-breakpoint
CREATE TABLE "modulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(80) NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "estado_modulo" DEFAULT 'activo' NOT NULL,
	"alcance" "alcance_modulo" NOT NULL,
	"depende_de" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "modulos_codigo_unique" ON "modulos" USING btree ("codigo");