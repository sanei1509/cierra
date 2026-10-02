CREATE TABLE "recibo_vistas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudio_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"mes" varchar(7) NOT NULL,
	"visto" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recibo_vistas" ADD CONSTRAINT "recibo_vistas_estudio_id_estudios_id_fk" FOREIGN KEY ("estudio_id") REFERENCES "public"."estudios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_vistas" ADD CONSTRAINT "recibo_vistas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_vistas" ADD CONSTRAINT "recibo_vistas_empleado_id_empleados_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recibo_vistas_empleado_mes_unique" ON "recibo_vistas" USING btree ("empleado_id","mes");--> statement-breakpoint
CREATE INDEX "recibo_vistas_empresa_mes_idx" ON "recibo_vistas" USING btree ("estudio_id","empresa_id","mes");