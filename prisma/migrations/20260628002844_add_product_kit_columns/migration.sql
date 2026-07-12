-- AlterTable
ALTER TABLE "products" ADD COLUMN     "kitBenefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kitCategory" TEXT,
ADD COLUMN     "kitMarginPercent" INTEGER,
ADD COLUMN     "kitRspMinor" INTEGER;
