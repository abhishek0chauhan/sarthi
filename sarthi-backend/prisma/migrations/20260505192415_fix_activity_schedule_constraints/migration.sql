-- CreateIndex
CREATE INDEX "ActivitySchedule_sessionId_dayIndex_idx" ON "ActivitySchedule"("sessionId", "dayIndex");

-- AddForeignKey
ALTER TABLE "ActivitySchedule" ADD CONSTRAINT "ActivitySchedule_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "SavedTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySchedule" ADD CONSTRAINT "ActivitySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumnComments
COMMENT ON COLUMN "ActivitySchedule"."distance" IS 'meters';
COMMENT ON COLUMN "ActivitySchedule"."estimatedTravelTime" IS 'minutes';
