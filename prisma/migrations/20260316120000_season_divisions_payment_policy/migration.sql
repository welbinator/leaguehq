-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('PER_PLAYER', 'PER_TEAM');

-- AlterTable
ALTER TABLE "Registration" ALTER COLUMN "amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Season" DROP COLUMN "price",
ADD COLUMN     "paymentDueDate" TIMESTAMP(3),
ADD COLUMN     "paymentRequired" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SeasonDivision" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "pricingType" "PricingType" NOT NULL DEFAULT 'PER_PLAYER',
    "maxTeams" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonDivision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeasonDivision_seasonId_idx" ON "SeasonDivision"("seasonId");

-- CreateIndex
CREATE INDEX "SeasonDivision_divisionId_idx" ON "SeasonDivision"("divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonDivision_seasonId_divisionId_key" ON "SeasonDivision"("seasonId", "divisionId");

-- AddForeignKey
ALTER TABLE "SeasonDivision" ADD CONSTRAINT "SeasonDivision_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonDivision" ADD CONSTRAINT "SeasonDivision_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

