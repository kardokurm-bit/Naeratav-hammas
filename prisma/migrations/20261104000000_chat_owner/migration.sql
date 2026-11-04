-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "ChatSession_ownerId_updatedAt_idx" ON "ChatSession"("ownerId", "updatedAt");
