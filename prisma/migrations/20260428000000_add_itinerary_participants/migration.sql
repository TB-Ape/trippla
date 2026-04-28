-- CreateTable
CREATE TABLE "ItineraryParticipant" (
    "id" TEXT NOT NULL,
    "itineraryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItineraryParticipant_itineraryItemId_idx" ON "ItineraryParticipant"("itineraryItemId");

-- CreateIndex
CREATE INDEX "ItineraryParticipant_userId_idx" ON "ItineraryParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryParticipant_itineraryItemId_userId_key" ON "ItineraryParticipant"("itineraryItemId", "userId");

-- CreateIndex
CREATE INDEX "Expense_transportId_idx" ON "Expense"("transportId");

-- AddForeignKey
ALTER TABLE "ItineraryParticipant" ADD CONSTRAINT "ItineraryParticipant_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "ItineraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryParticipant" ADD CONSTRAINT "ItineraryParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
