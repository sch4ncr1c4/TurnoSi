# Architecture

- `apps/api`: API REST `Express` bajo `/api/v1`, monolito modular por dominio.
- `apps/web`: `React` + `Vite` + `Tailwind CSS`, interfaz mobile-first.
- `apps/web/src/app`: punto de entrada y resolución mínima de rutas.
- `apps/web/src/components`: piezas compartidas de UI y layout.
- `apps/web/src/features`: pantallas y datos separados por dominio visual (`landing`, `auth`, `dashboard`).
- `Prisma` + `PostgreSQL`: persistencia con `organizationId` en recursos multi-tenant.
- Aislamiento tenant: el backend debe resolver el contexto de organización del usuario autenticado y reutilizarlo en todas las consultas sensibles.
- Roles iniciales: `owner`, `admin`, `member`.
- Billing recurrente con Mercado Pago, trial y control de acceso por suscripción.
- Scheduling con disponibilidad, recursos, capacidad y reservas públicas serializables.
