-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateDescription" TEXT,
ADD COLUMN     "templateUseCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Expense_transportId_idx" ON "Expense"("transportId");
