ALTER TABLE "periodos" ADD COLUMN "solicitud" jsonb;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "versiones" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "aprobacion" jsonb;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "advertencias_aceptadas" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "cerrado" jsonb;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "rectificaciones" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "periodos" ADD COLUMN "notas" jsonb DEFAULT '[]'::jsonb NOT NULL;