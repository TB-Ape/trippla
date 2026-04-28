-- CreateIndex
CREATE INDEX "ItineraryItem_createdById_idx" ON "ItineraryItem"("createdById");

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
