-- AlterTable
ALTER TABLE "publish_schedules" ADD COLUMN "campaign_id" TEXT;

-- CreateIndex
CREATE INDEX "publish_schedules_campaign_id_idx" ON "publish_schedules"("campaign_id");

-- AddForeignKey
ALTER TABLE "publish_schedules" ADD CONSTRAINT "publish_schedules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
