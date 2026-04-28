-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "itineraryItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_itineraryItemId_key" ON "Expense"("itineraryItemId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "ItineraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
