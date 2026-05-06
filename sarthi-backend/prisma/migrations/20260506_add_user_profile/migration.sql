-- Add userProfile column to LiveGuideSession for caching traveler profile
ALTER TABLE "LiveGuideSession" ADD COLUMN "userProfile" JSONB;
