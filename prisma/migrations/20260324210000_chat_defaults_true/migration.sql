-- Change default to true for teamChatsEnabled and chatEnabled
ALTER TABLE "League" ALTER COLUMN "teamChatsEnabled" SET DEFAULT true;
ALTER TABLE "Season" ALTER COLUMN "chatEnabled" SET DEFAULT true;

-- Flip all existing rows to true so current leagues/seasons get chat enabled
UPDATE "League" SET "teamChatsEnabled" = true WHERE "teamChatsEnabled" = false;
UPDATE "Season" SET "chatEnabled" = true WHERE "chatEnabled" = false;
