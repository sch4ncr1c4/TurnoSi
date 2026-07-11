# sistema-turnos

Monolito modular con `apps/api` y `apps/web` sobre `pnpm workspace`.

## Producción

1. Configurar las variables de `.env.example` en el gestor de secretos.
2. Rotar `AUTH_SECRET`, Access Token y firma webhook antes del primer deploy.
3. Ejecutar `pnpm install --frozen-lockfile`.
4. Ejecutar `pnpm deploy:api` antes de iniciar la nueva versión.
5. Iniciar API con `pnpm --filter @sistema-turnos/api start`.
6. Publicar `apps/web/dist` detrás de HTTPS.
7. Configurar Mercado Pago hacia `/api/v1/billing/webhooks/mercadopago`.
8. Usar `/health` para liveness y `/api/v1/health/ready` para readiness.

## Datos

- Activar backups diarios y recuperación punto en el tiempo en PostgreSQL.
- Conservar al menos 30 días y cifrar backups en reposo.
- Probar una restauración completa en staging mensualmente.
- Nunca ejecutar `prisma migrate reset` fuera de desarrollo.

## Validación

Antes de publicar:

```bash
pnpm lint
pnpm typecheck
pnpm --filter @sistema-turnos/api test
pnpm build
```
