-- CreateTable
CREATE TABLE "PlayerRegistration" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonDivisionId" TEXT,
    "teamRegistrationId" TEXT,
    "playerName" TEXT NOT NULL,
    "playerEmail" TEXT NOT NULL,
    "playerPhone" TEXT,
    "notes" TEXT,
    "paymentStatus" TEXT,
    "paymentAmount" DECIMAL(10,2),
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerRegistration_seasonId_idx" ON "PlayerRegistration"("seasonId");

-- CreateIndex
CREATE INDEX "PlayerRegistration_teamRegistrationId_idx" ON "PlayerRegistration"("teamRegistrationId");

-- AddForeignKey
ALTER TABLE "PlayerRegistration" ADD CONSTRAINT "PlayerRegistration_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRegistration" ADD CONSTRAINT "PlayerRegistration_seasonDivisionId_fkey" FOREIGN KEY ("seasonDivisionId") REFERENCES "SeasonDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRegistration" ADD CONSTRAINT "PlayerRegistration_teamRegistrationId_fkey" FOREIGN KEY ("teamRegistrationId") REFERENCES "TeamRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
