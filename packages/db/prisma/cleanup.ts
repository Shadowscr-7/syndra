/**
 * Database cleanup script
 * Keeps: usr_jcg_admin user, ws_default workspace, new plans (FREE/PRO/ENTERPRISE), subscription
 * Deletes: everything else
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ADMIN_ID = 'usr_jcg_admin';
  const WORKSPACE_ID = 'ws_default';

  console.log('🧹 Starting database cleanup...\n');

  // 1. Delete all users except admin (cascading handles most relations)
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { not: ADMIN_ID } },
  });
  console.log(`  ✓ Deleted ${deletedUsers.count} users (kept ${ADMIN_ID})`);

  // 2. Delete all workspaces except ws_default (cascading handles related data)
  const deletedWs = await prisma.workspace.deleteMany({
    where: { id: { not: WORKSPACE_ID } },
  });
  console.log(`  ✓ Deleted ${deletedWs.count} workspaces (kept ${WORKSPACE_ID})`);

  // 3. Clean workspace data
  const deletedThemes = await prisma.contentTheme.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedThemes.count} content themes`);

  const deletedSources = await prisma.researchSource.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedSources.count} research sources`);

  const deletedCampaigns = await prisma.campaign.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedCampaigns.count} campaigns`);

  const deletedBrand = await prisma.brandProfile.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedBrand.count} brand profiles`);

  const deletedRuns = await prisma.editorialRun.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedRuns.count} editorial runs`);

  const deletedCreds = await prisma.apiCredential.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedCreds.count} API credentials`);

  const deletedInvitations = await prisma.invitation.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedInvitations.count} invitations`);

  const deletedUsage = await prisma.usageRecord.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedUsage.count} usage records`);

  const deletedInsights = await prisma.performanceInsight.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`  ✓ Deleted ${deletedInsights.count} performance insights`);

  // 4. Clean user-level data for admin
  const deletedUserCreds = await prisma.userCredential.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedUserCreds.count} user credentials`);

  const deletedPersonas = await prisma.userPersona.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedPersonas.count} user personas`);

  const deletedProfiles = await prisma.contentProfile.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedProfiles.count} content profiles`);

  const deletedVisualStyles = await prisma.visualStyleProfile.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedVisualStyles.count} visual style profiles`);

  const deletedMedia = await prisma.userMedia.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedMedia.count} user media files`);

  const deletedFolders = await prisma.mediaFolder.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedFolders.count} media folders`);

  const deletedSchedules = await prisma.publishSchedule.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedSchedules.count} publish schedules`);

  const deletedTokens1 = await prisma.emailVerificationToken.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedTokens1.count} email verification tokens`);

  const deletedTokens2 = await prisma.passwordResetToken.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedTokens2.count} password reset tokens`);

  const deletedRefresh = await prisma.refreshToken.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedRefresh.count} refresh tokens`);

  const deletedTgLinks = await prisma.telegramLink.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedTgLinks.count} telegram links`);

  const deletedTgTokens = await prisma.telegramLinkToken.deleteMany({ where: { userId: ADMIN_ID } });
  console.log(`  ✓ Deleted ${deletedTgTokens.count} telegram link tokens`);

  // 5. Clean standalone tables
  const deletedPayments = await prisma.paymentLog.deleteMany({});
  console.log(`  ✓ Deleted ${deletedPayments.count} payment logs`);

  const deletedLicenses = await prisma.licenseKey.deleteMany({});
  console.log(`  ✓ Deleted ${deletedLicenses.count} license keys`);

  const deletedAudit = await prisma.auditLog.deleteMany({});
  console.log(`  ✓ Deleted ${deletedAudit.count} audit logs`);

  const deletedReferrals = await prisma.affiliateReferral.deleteMany({});
  console.log(`  ✓ Deleted ${deletedReferrals.count} affiliate referrals`);

  const deletedPayouts = await prisma.commissionPayout.deleteMany({});
  console.log(`  ✓ Deleted ${deletedPayouts.count} commission payouts`);

  const deletedJobs = await prisma.jobQueueLog.deleteMany({});
  console.log(`  ✓ Deleted ${deletedJobs.count} job queue logs`);

  // 6. Delete old seed plans (keep new FREE/PRO/ENTERPRISE)
  const deletedOldPlans = await prisma.plan.deleteMany({
    where: { id: { in: ['plan_starter', 'plan_creator', 'plan_pro'] } },
  });
  console.log(`  ✓ Deleted ${deletedOldPlans.count} old plans (kept FREE/PRO/ENTERPRISE)`);

  // 7. Reset admin user fields
  await prisma.user.update({
    where: { id: ADMIN_ID },
    data: {
      referredByCode: null,
      referralCode: null,
      lastLoginAt: null,
    },
  });
  console.log(`  ✓ Reset admin user fields`);

  // 8. Reset workspace to clean state
  await prisma.workspace.update({
    where: { id: WORKSPACE_ID },
    data: {
      onboardingCompleted: false,
      industry: null,
      logoUrl: null,
    },
  });
  console.log(`  ✓ Reset workspace to clean state`);

  // Verify final state
  console.log('\n📊 Final state:');
  const userCount = await prisma.user.count();
  const wsCount = await prisma.workspace.count();
  const planCount = await prisma.plan.count();
  const subCount = await prisma.subscription.count();
  const admin = await prisma.user.findUnique({ where: { id: ADMIN_ID }, select: { email: true, name: true, role: true } });
  const plans = await prisma.plan.findMany({ select: { name: true, displayName: true } });
  console.log(`  Users: ${userCount}`);
  console.log(`  Workspaces: ${wsCount}`);
  console.log(`  Plans: ${planCount} — ${plans.map(p => p.name).join(', ')}`);
  console.log(`  Subscriptions: ${subCount}`);
  console.log(`  Admin: ${admin?.email} (${admin?.name}) [${admin?.role}]`);

  console.log('\n✅ Database cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
