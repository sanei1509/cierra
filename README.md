# Cierra · prototipo

Prototipo funcional de liquidación de sueldos multiempresa y recibos web para estudios contables de Uruguay.
Spec y modelo de negocio en `../docs/`. Arquitectura del MVP: [`docs/arquitectura-mvp.md`](docs/arquitectura-mvp.md).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

- Los datos son ficticios y se guardan en el navegador (localStorage). Botón "Reiniciar datos de ejemplo" en la barra lateral.
- Cambiá de usuario (arriba a la derecha) para probar roles: Administradora, Liquidador, Solo lectura.
- "Cliente y empleado" en la barra lateral abre los portales.
- La fecha de la demo está fija en septiembre 2026.

## Estructura

| Archivo | Qué es |
|---|---|
| `cierrafe/` | Frontend Next.js: pantallas del estudio, cliente y empleado |
| `cierrafe/src/lib/engine.ts` | Motor de cálculo determinista usado por el front actual |
| `cierrafe/src/lib/params.ts` | Parámetros normativos y laudos con vigencia (**valores de ejemplo**) |
| `cierrafe/src/lib/store.ts` | Workflow demo en navegador, a reemplazar por backend |
| `cierrabe/` | Backend: schema PostgreSQL, Drizzle, contratos y acceso a datos |
| `cierrabe/src/datos/schema.ts` | Primer esquema real de base de datos |
| `cierrabe/drizzle/` | Migraciones SQL generadas |
| `docs/` | Arquitectura y notas de desarrollo |

Deploy: `vercel` (es una app Next.js estática en su mayoría, entra en el plan gratuito).
