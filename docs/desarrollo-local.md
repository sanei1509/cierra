# Desarrollo local con base de datos

## Requisitos
- Node.js 22+
- Corepack
- Docker Desktop o PostgreSQL 17 local

## Instalar dependencias

```bash
corepack pnpm install
```

Si Windows no tiene el shim global de `pnpm`, se puede usar:

```bash
npx pnpm@11.22.0 install
```

## Levantar PostgreSQL con Docker

```bash
docker compose up -d postgres
```

La URL local por defecto queda:

```bash
DATABASE_URL=postgresql://cierra:cierra@localhost:5432/cierra_dev
```

Copiar `.env.example` a `.env.local` o cargar esa variable en la terminal.

## Migraciones

Generar migraciones desde el schema TypeScript:

```bash
corepack pnpm db:generate
```

Aplicarlas a la base:

```bash
corepack pnpm db:migrate
```

## Verificaciones

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

Los comandos se ejecutan desde la raiz, pero el codigo esta separado:

- `cierrafe`: frontend Next.js.
- `cierrabe`: backend/base de datos.

## Nota de seguridad

Las tablas de negocio tienen `estudio_id` y la migracion inicial activa Row Level Security usando `app.estudio_id`. Cuando implementemos repositorios reales, cada request debe abrir transaccion y ejecutar:

```sql
SET LOCAL app.estudio_id = '<uuid-del-estudio>';
```

Sin ese valor, Postgres no debe devolver datos de negocio.
