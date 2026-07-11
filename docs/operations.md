# Operations

## Backups

- Enable daily managed PostgreSQL backups and point-in-time recovery.
- Retain 30 days, encrypt at rest, and test a staging restore monthly.
- Alert when a backup or monthly restore verification fails.

## Monitoring and alerts

- Monitor `GET /health` every minute and `GET /api/v1/health/ready` every five minutes.
- Alert after three failures, API 5xx above 2%, or p95 latency above two seconds.
- Alert on failed Mercado Pago webhooks, cleanup jobs, database saturation, and expiring certificates.

## Rate limiting

The API uses process memory to avoid PostgreSQL writes. Run one API instance initially. Before horizontal scaling, replace the store with managed Redis so all instances share counters.
