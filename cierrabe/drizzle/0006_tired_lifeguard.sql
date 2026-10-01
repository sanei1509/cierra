CREATE TABLE "aplicaciones_pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pago_id" uuid NOT NULL,
	"estudio_id" uuid NOT NULL,
	"mes" varchar(7) NOT NULL,
	"importe_cent" integer NOT NULL,
	"nota" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_estudio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"moneda" "moneda" DEFAULT 'UYU' NOT NULL,
	"importe_cent" integer NOT NULL,
	"fecha" timestamp NOT NULL,
	"medio" text,
	"referencia" text,
	"nota" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aplicaciones_pago" ADD CONSTRAINT "aplicaciones_pago_pago_id_pagos_estudio_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos_estudio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aplicaciones_pago" ADD CONSTRAINT "aplicaciones_pago_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_estudio" ADD CONSTRAINT "pagos_estudio_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aplicaciones_pago_estudio_mes_idx" ON "aplicaciones_pago" USING btree ("estudio_id","mes");--> statement-breakpoint
CREATE INDEX "pagos_estudio_fecha_idx" ON "pagos_estudio" USING btree ("estudio_id","fecha");