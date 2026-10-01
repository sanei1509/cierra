CREATE TYPE "public"."tipo_evento_uso" AS ENUM('empresa_activa', 'empleado_activo', 'recibo_generado', 'recibo_enviado');--> statement-breakpoint
CREATE TABLE "eventos_uso_facturable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"mes" varchar(7) NOT NULL,
	"tipo" "tipo_evento_uso" NOT NULL,
	"cantidad" integer NOT NULL,
	"referencia_id" text,
	"nota" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumenes_cobro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"mes" varchar(7) NOT NULL,
	"moneda" "moneda" DEFAULT 'UYU' NOT NULL,
	"suscripcion_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"estado_suscripcion" "estado_suscripcion" NOT NULL,
	"lineas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eventos_uso" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_cent" integer DEFAULT 0 NOT NULL,
	"notas_internas" text,
	"generado" timestamp with time zone NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos_uso_facturable" ADD CONSTRAINT "eventos_uso_facturable_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumenes_cobro" ADD CONSTRAINT "resumenes_cobro_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumenes_cobro" ADD CONSTRAINT "resumenes_cobro_suscripcion_id_suscripciones_estudio_id_fk" FOREIGN KEY ("suscripcion_id") REFERENCES "public"."suscripciones_estudio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumenes_cobro" ADD CONSTRAINT "resumenes_cobro_plan_id_planes_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."planes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_uso_estudio_mes_idx" ON "eventos_uso_facturable" USING btree ("estudio_id","mes");--> statement-breakpoint
CREATE INDEX "eventos_uso_tipo_idx" ON "eventos_uso_facturable" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "resumenes_cobro_estudio_mes_unique" ON "resumenes_cobro" USING btree ("estudio_id","mes");--> statement-breakpoint
CREATE INDEX "resumenes_cobro_mes_idx" ON "resumenes_cobro" USING btree ("mes");