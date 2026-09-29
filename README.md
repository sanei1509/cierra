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
| `src/lib/engine.ts` | Motor de cálculo determinista (sin dependencias de UI) |
| `src/lib/params.ts` | Parámetros normativos y laudos con vigencia (**valores de ejemplo**) |
| `src/lib/validations.ts` | Alertas bloqueantes, advertencias e informativas |
| `src/lib/store.ts` | Workflow del período y auditoría (reemplazar por API + DB en producción) |
| `src/lib/seed.ts` | 12 empresas y ~45 personas de ejemplo |
| `src/app/(estudio)/` | Área del contador |
| `src/app/cliente/[id]` | Portal del cliente |
| `src/app/portal/[id]` | Portal del empleado (mobile) |
| `src/app/recibo/[id]/[mes]` | Recibo imprimible |

Deploy: `vercel` (es una app Next.js estática en su mayoría, entra en el plan gratuito).
