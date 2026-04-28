-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "isTemplateStore" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PackingList" ADD COLUMN "tripCategory" TEXT;

-- Partial unique index: at most one template store per user
CREATE UNIQUE INDEX "trips_owner_template_store_unique"
  ON "Trip" ("ownerId")
  WHERE "isTemplateStore" = true;
