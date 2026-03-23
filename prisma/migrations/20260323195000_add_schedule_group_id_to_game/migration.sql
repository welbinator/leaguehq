-- AlterTable
ALTER TABLE "Game" ADD COLUMN "scheduleGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Game_scheduleGroupId_idx" ON "Game"("scheduleGroupId");
