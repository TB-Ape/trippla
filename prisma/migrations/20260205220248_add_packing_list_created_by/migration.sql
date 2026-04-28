/*
  Warnings:

  - Added the required column `createdById` to the `PackingList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PackingList" ADD COLUMN     "createdById" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "PackingList_createdById_idx" ON "PackingList"("createdById");

-- AddForeignKey
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
