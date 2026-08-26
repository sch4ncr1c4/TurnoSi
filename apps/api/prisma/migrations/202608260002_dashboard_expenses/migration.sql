CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_amount_positive" CHECK ("amountCents" > 0);

CREATE INDEX "Expense_organizationId_occurredOn_idx"
  ON "Expense"("organizationId", "occurredOn");

CREATE INDEX "Expense_organizationId_category_idx"
  ON "Expense"("organizationId", "category");
