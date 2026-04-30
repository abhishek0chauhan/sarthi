-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationPrefs" JSONB;

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveGuideSession" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "currentDay" INTEGER NOT NULL,
    "activityStatus" JSONB NOT NULL,
    "lastLocation" JSONB,
    "lastBriefingAt" TIMESTAMP(3),
    "lastBreakfastAt" TIMESTAMP(3),
    "lastLunchAt" TIMESTAMP(3),
    "lastDinnerAt" TIMESTAMP(3),
    "replanCount" JSONB,
    "lastSuggestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveGuideSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_fcmToken_key" ON "UserDevice"("fcmToken");

-- CreateIndex
CREATE INDEX "UserDevice_userId_idx" ON "UserDevice"("userId");

-- CreateIndex
CREATE INDEX "LiveGuideSession_tripId_idx" ON "LiveGuideSession"("tripId");

-- CreateIndex
CREATE INDEX "LiveGuideSession_userId_idx" ON "LiveGuideSession"("userId");

-- CreateIndex
CREATE INDEX "LiveGuideSession_isActive_idx" ON "LiveGuideSession"("isActive");

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveGuideSession" ADD CONSTRAINT "LiveGuideSession_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "SavedTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveGuideSession" ADD CONSTRAINT "LiveGuideSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
