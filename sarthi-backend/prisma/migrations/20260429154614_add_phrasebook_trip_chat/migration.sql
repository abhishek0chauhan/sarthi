-- AlterTable
ALTER TABLE "SavedTrip" ADD COLUMN     "phrasebookData" JSONB;

-- CreateTable
CREATE TABLE "TripChatMessage" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripChatMessage_tripId_createdAt_idx" ON "TripChatMessage"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "TripChatMessage" ADD CONSTRAINT "TripChatMessage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "SavedTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
