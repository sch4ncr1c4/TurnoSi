UPDATE "Customer"
SET
  "email" = NULLIF(lower(trim("email")), ''),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" IS NOT NULL;

UPDATE "Customer"
SET
  "phone" = NULLIF(
    CASE
      WHEN regexp_replace("phone", '\D', '', 'g') LIKE '00%' THEN substring(regexp_replace("phone", '\D', '', 'g') FROM 3)
      WHEN regexp_replace("phone", '\D', '', 'g') LIKE '549%' AND length(regexp_replace("phone", '\D', '', 'g')) > 10 THEN substring(regexp_replace("phone", '\D', '', 'g') FROM 4)
      WHEN regexp_replace("phone", '\D', '', 'g') LIKE '54%' AND length(regexp_replace("phone", '\D', '', 'g')) > 10 THEN substring(regexp_replace("phone", '\D', '', 'g') FROM 3)
      WHEN regexp_replace("phone", '\D', '', 'g') LIKE '0%' AND length(regexp_replace("phone", '\D', '', 'g')) > 8 THEN substring(regexp_replace("phone", '\D', '', 'g') FROM 2)
      ELSE regexp_replace("phone", '\D', '', 'g')
    END,
    ''
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "phone" IS NOT NULL;

WITH RECURSIVE
active_customers AS (
  SELECT "id", "organizationId", "createdAt"
  FROM "Customer"
  WHERE "deletedAt" IS NULL
),
edges AS (
  SELECT c1."id" AS source_id, c2."id" AS target_id
  FROM "Customer" c1
  JOIN "Customer" c2
    ON c1."organizationId" = c2."organizationId"
   AND c1."deletedAt" IS NULL
   AND c2."deletedAt" IS NULL
   AND c1."id" <> c2."id"
   AND (
     (c1."email" IS NOT NULL AND c2."email" IS NOT NULL AND lower(c1."email") = lower(c2."email"))
     OR
     (c1."phone" IS NOT NULL AND c2."phone" IS NOT NULL AND c1."phone" = c2."phone")
   )
  UNION
  SELECT "id", "id"
  FROM active_customers
),
walk(root_id, customer_id) AS (
  SELECT "id", "id"
  FROM active_customers
  UNION
  SELECT walk.root_id, edges.target_id
  FROM walk
  JOIN edges ON edges.source_id = walk.customer_id
),
canonical_candidates AS (
  SELECT
    walk.customer_id,
    first_value(walk.root_id) OVER (
      PARTITION BY walk.customer_id
      ORDER BY root_customer."createdAt" ASC, walk.root_id ASC
    ) AS canonical_id
  FROM walk
  JOIN "Customer" root_customer ON root_customer."id" = walk.root_id
),
canonical AS (
  SELECT DISTINCT customer_id, canonical_id
  FROM canonical_candidates
),
customer_rollup AS (
  SELECT
    canonical.canonical_id,
    max(customer."noShowCount") AS "noShowCount",
    min(customer."blockedAt") FILTER (WHERE customer."blockedAt" IS NOT NULL) AS "blockedAt",
    max(customer."blockedReason") FILTER (WHERE customer."blockedReason" IS NOT NULL) AS "blockedReason",
    max(customer."email") FILTER (WHERE customer."email" IS NOT NULL) AS "email",
    max(customer."phone") FILTER (WHERE customer."phone" IS NOT NULL) AS "phone"
  FROM canonical
  JOIN "Customer" customer ON customer."id" = canonical.customer_id
  GROUP BY canonical.canonical_id
)
UPDATE "Customer" customer
SET
  "noShowCount" = greatest(customer."noShowCount", customer_rollup."noShowCount"),
  "blockedAt" = COALESCE(customer."blockedAt", customer_rollup."blockedAt"),
  "blockedReason" = COALESCE(customer."blockedReason", customer_rollup."blockedReason"),
  "email" = COALESCE(customer."email", customer_rollup."email"),
  "phone" = COALESCE(customer."phone", customer_rollup."phone"),
  "updatedAt" = CURRENT_TIMESTAMP
FROM customer_rollup
WHERE customer."id" = customer_rollup.canonical_id;

WITH RECURSIVE
active_customers AS (
  SELECT "id", "organizationId", "createdAt"
  FROM "Customer"
  WHERE "deletedAt" IS NULL
),
edges AS (
  SELECT c1."id" AS source_id, c2."id" AS target_id
  FROM "Customer" c1
  JOIN "Customer" c2
    ON c1."organizationId" = c2."organizationId"
   AND c1."deletedAt" IS NULL
   AND c2."deletedAt" IS NULL
   AND c1."id" <> c2."id"
   AND (
     (c1."email" IS NOT NULL AND c2."email" IS NOT NULL AND lower(c1."email") = lower(c2."email"))
     OR
     (c1."phone" IS NOT NULL AND c2."phone" IS NOT NULL AND c1."phone" = c2."phone")
   )
  UNION
  SELECT "id", "id"
  FROM active_customers
),
walk(root_id, customer_id) AS (
  SELECT "id", "id"
  FROM active_customers
  UNION
  SELECT walk.root_id, edges.target_id
  FROM walk
  JOIN edges ON edges.source_id = walk.customer_id
),
canonical_candidates AS (
  SELECT
    walk.customer_id,
    first_value(walk.root_id) OVER (
      PARTITION BY walk.customer_id
      ORDER BY root_customer."createdAt" ASC, walk.root_id ASC
    ) AS canonical_id
  FROM walk
  JOIN "Customer" root_customer ON root_customer."id" = walk.root_id
),
canonical AS (
  SELECT DISTINCT customer_id, canonical_id
  FROM canonical_candidates
)
UPDATE "Appointment" appointment
SET "customerId" = canonical.canonical_id
FROM canonical
WHERE appointment."customerId" = canonical.customer_id
  AND canonical.customer_id <> canonical.canonical_id;

WITH RECURSIVE
active_customers AS (
  SELECT "id", "organizationId", "createdAt"
  FROM "Customer"
  WHERE "deletedAt" IS NULL
),
edges AS (
  SELECT c1."id" AS source_id, c2."id" AS target_id
  FROM "Customer" c1
  JOIN "Customer" c2
    ON c1."organizationId" = c2."organizationId"
   AND c1."deletedAt" IS NULL
   AND c2."deletedAt" IS NULL
   AND c1."id" <> c2."id"
   AND (
     (c1."email" IS NOT NULL AND c2."email" IS NOT NULL AND lower(c1."email") = lower(c2."email"))
     OR
     (c1."phone" IS NOT NULL AND c2."phone" IS NOT NULL AND c1."phone" = c2."phone")
   )
  UNION
  SELECT "id", "id"
  FROM active_customers
),
walk(root_id, customer_id) AS (
  SELECT "id", "id"
  FROM active_customers
  UNION
  SELECT walk.root_id, edges.target_id
  FROM walk
  JOIN edges ON edges.source_id = walk.customer_id
),
canonical_candidates AS (
  SELECT
    walk.customer_id,
    first_value(walk.root_id) OVER (
      PARTITION BY walk.customer_id
      ORDER BY root_customer."createdAt" ASC, walk.root_id ASC
    ) AS canonical_id
  FROM walk
  JOIN "Customer" root_customer ON root_customer."id" = walk.root_id
),
canonical AS (
  SELECT DISTINCT customer_id, canonical_id
  FROM canonical_candidates
)
UPDATE "Customer" customer
SET
  "deletedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
FROM canonical
WHERE customer."id" = canonical.customer_id
  AND canonical.customer_id <> canonical.canonical_id;

CREATE UNIQUE INDEX "Customer_organizationId_email_active_key"
ON "Customer"("organizationId", lower("email"))
WHERE "deletedAt" IS NULL AND "email" IS NOT NULL;

CREATE UNIQUE INDEX "Customer_organizationId_phone_active_key"
ON "Customer"("organizationId", "phone")
WHERE "deletedAt" IS NULL AND "phone" IS NOT NULL;
