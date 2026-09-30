CREATE TYPE "public"."estado_usuario" AS ENUM('invitado', 'activo', 'suspendido');--> statement-breakpoint
CREATE TYPE "public"."proveedor_auth" AS ENUM('password', 'magic_link', 'google', 'microsoft');--> statement-breakpoint
CREATE TYPE "public"."tema_preferido" AS ENUM('system', 'light', 'dark');--> statement-breakpoint
CREATE TABLE "credenciales_password" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"actualizada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas_oauth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"proveedor" "proveedor_auth" NOT NULL,
	"proveedor_cuenta_id" text NOT NULL,
	"email" text NOT NULL,
	"creada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"expira" timestamp with time zone NOT NULL,
	"usado" timestamp with time zone,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira" timestamp with time zone NOT NULL,
	"revocada" timestamp with time zone,
	"ip_hash" text,
	"user_agent" text,
	"creada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "estado" "estado_usuario" DEFAULT 'invitado' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "tema_preferido" "tema_preferido" DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "ultimo_acceso" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credenciales_password" ADD CONSTRAINT "credenciales_password_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_oauth" ADD CONSTRAINT "cuentas_oauth_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_oauth_proveedor_cuenta_unique" ON "cuentas_oauth" USING btree ("proveedor","proveedor_cuenta_id");--> statement-breakpoint
CREATE INDEX "cuentas_oauth_usuario_idx" ON "cuentas_oauth" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "magic_links_token_hash_unique" ON "magic_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "magic_links_usuario_idx" ON "magic_links" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sesiones_token_hash_unique" ON "sesiones" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sesiones_usuario_idx" ON "sesiones" USING btree ("usuario_id");