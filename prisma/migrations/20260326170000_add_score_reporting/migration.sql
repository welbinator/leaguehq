-- CreateEnum
CREATE TYPE "ScoreStatus" AS ENUM ('NONE', 'PENDING_HOME', 'PENDING_AWAY', 'CONFIRMED', 'DISPUTED');

-- AlterTable
ALTER TABLE "Game"
  ADD COLUMN "scoreStatus"   "ScoreStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "homeScoreHome" INTEGER,
  ADD COLUMN "awayScoreHome" INTEGER,
  ADD COLUMN "homeScoreAway" INTEGER,
  ADD COLUMN "awayScoreAway" INTEGER;
