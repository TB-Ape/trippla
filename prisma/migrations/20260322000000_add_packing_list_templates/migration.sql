-- AlterTable
ALTER TABLE "PackingList" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PackingList" ADD COLUMN "templateDescription" TEXT;
ALTER TABLE "PackingList" ADD COLUMN "templateUseCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PackingList" ADD COLUMN "shareCode" TEXT;

-- Backfill shareCode for existing rows
UPDATE "PackingList" SET "shareCode" = gen_random_uuid()::text WHERE "shareCode" IS NULL;

-- Make shareCode NOT NULL and UNIQUE
ALTER TABLE "PackingList" ALTER COLUMN "shareCode" SET NOT NULL;
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_shareCode_key" UNIQUE ("shareCode");

-- CreateIndex
CREATE INDEX "PackingList_shareCode_idx" ON "PackingList"("shareCode");

-- CreateIndex
CREATE INDEX "PackingList_isTemplate_idx" ON "PackingList"("isTemplate");
