-- AlterTable
ALTER TABLE "TeamRegistration" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentAmount" DECIMAL(10,2),
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;
