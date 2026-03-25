-- AlterTable
ALTER TABLE "weekly_plan_configs" ADD COLUMN "campaign_id" TEXT;

-- CreateIndex
CREATE INDEX "weekly_plan_configs_campaign_id_idx" ON "weekly_plan_configs"("campaign_id");

-- AddForeignKey
ALTER TABLE "weekly_plan_configs" ADD CONSTRAINT "weekly_plan_configs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
