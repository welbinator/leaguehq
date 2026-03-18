-- AlterTable
ALTER TABLE "PlayerRegistration" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "TeamRegistration" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" TEXT;

-- CreateIndex
CREATE INDEX "PlayerRegistration_userId_idx" ON "PlayerRegistration"("userId");

-- CreateIndex
CREATE INDEX "TeamRegistration_userId_idx" ON "TeamRegistration"("userId");

-- AddForeignKey
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRegistration" ADD CONSTRAINT "PlayerRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
