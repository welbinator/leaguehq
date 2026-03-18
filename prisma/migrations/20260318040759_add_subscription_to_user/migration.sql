-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN     "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';
