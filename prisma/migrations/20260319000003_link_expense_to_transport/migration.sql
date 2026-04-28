-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "transportId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_transportId_key" ON "Expense"("transportId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
