-- CreateTable
CREATE TABLE "ActivitySchedule" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "activityIndex" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "distance" INTEGER NOT NULL,
    "estimatedTravelTime" INTEGER NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivitySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySchedule_idempotencyKey_key" ON "ActivitySchedule"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ActivitySchedule_sessionId_idx" ON "ActivitySchedule"("sessionId");

-- CreateIndex
CREATE INDEX "ActivitySchedule_tripId_userId_idx" ON "ActivitySchedule"("tripId", "userId");

-- CreateIndex
CREATE INDEX "ActivitySchedule_notificationSent_scheduledTime_idx" ON "ActivitySchedule"("notificationSent", "scheduledTime");

-- AddForeignKey
ALTER TABLE "ActivitySchedule" ADD CONSTRAINT "ActivitySchedule_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveGuideSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
