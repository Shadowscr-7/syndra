-- AlterEnum: Add IMAGE_PRO_TEXT and MUSIC_BACKGROUND to CreditOperationType
ALTER TYPE "CreditOperationType" ADD VALUE IF NOT EXISTS 'IMAGE_PRO_TEXT';
ALTER TYPE "CreditOperationType" ADD VALUE IF NOT EXISTS 'MUSIC_BACKGROUND';

-- AlterEnum: Add AUDIO to MediaType
ALTER TYPE "MediaType" ADD VALUE IF NOT EXISTS 'AUDIO';

-- AlterTable: Add music fields to weekly_plan_configs
ALTER TABLE "weekly_plan_configs" ADD COLUMN "music_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weekly_plan_configs" ADD COLUMN "music_style" TEXT;
ALTER TABLE "weekly_plan_configs" ADD COLUMN "music_prompt" TEXT;

-- AlterTable: Add music fields to campaigns
ALTER TABLE "campaigns" ADD COLUMN "music_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "campaigns" ADD COLUMN "music_style" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "music_prompt" TEXT;
