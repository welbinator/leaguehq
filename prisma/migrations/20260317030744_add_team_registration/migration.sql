-- CreateTable
CREATE TABLE "TeamRegistration" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonDivisionId" TEXT,
    "teamName" TEXT NOT NULL,
    "captainName" TEXT NOT NULL,
    "captainEmail" TEXT NOT NULL,
    "captainPhone" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamRegistration_seasonId_idx" ON "TeamRegistration"("seasonId");

-- CreateIndex
CREATE INDEX "TeamRegistration_status_idx" ON "TeamRegistration"("status");

-- AddForeignKey
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_seasonDivisionId_fkey" FOREIGN KEY ("seasonDivisionId") REFERENCES "SeasonDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
