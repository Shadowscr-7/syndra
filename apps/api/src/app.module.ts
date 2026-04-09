import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantMiddleware } from './auth/tenant.middleware';
import { HealthModule } from './health/health.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { QueueModule } from './queue/queue.module';
import { ResearchModule } from './research/research.module';
import { StrategyModule } from './strategy/strategy.module';
import { ContentModule } from './content/content.module';
import { EditorialModule } from './editorial/editorial.module';
import { MediaModule } from './media/media.module';
import { TelegramModule } from './telegram/telegram.module';
import { PublisherModule } from './publisher/publisher.module';
import { VideoModule } from './video/video.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PlansModule } from './plans/plans.module';
import { InvitationsModule } from './invitations/invitations.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AdminModule } from './admin/admin.module';
import { PartnerModule } from './partner/partner.module';
import { CredentialsModule } from './credentials/credentials.module';
import { PersonasModule } from './personas/personas.module';
import { ProfilesModule } from './profiles/profiles.module';
import { VisualStylesModule } from './visual-styles/visual-styles.module';
import { UserMediaModule } from './user-media/user-media.module';
import { MediaFoldersModule } from './media-folders/media-folders.module';
import { SchedulesModule } from './schedules/schedules.module';
import { EmailModule } from './email/email.module';
import { PaypalModule } from './paypal/paypal.module';
import { AlertsModule } from './alerts/alerts.module';
import { ChurnModule } from './churn/churn.module';
import { ObservabilityModule } from './observability/observability.module';
import { LearningModule } from './learning/learning.module';
import { StrategistModule } from './strategist/strategist.module';
import { TrendsModule } from './trends/trends.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { BrandMemoryModule } from './brand-memory/brand-memory.module';
import { SourceTrustModule } from './source-trust/source-trust.module';
import { PlaybookModule } from './playbooks/playbook.module';
import { BusinessProfileModule } from './business-profile/business-profile.module';
import { BusinessBriefsModule } from './business-briefs/business-briefs.module';
import { CreditsModule } from './credits/credits.module';
import { WeeklyPlannerModule } from './weekly-planner/weekly-planner.module';
import { ReferenceCopyModule } from './reference-copy/reference-copy.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    HealthModule,
    WorkspacesModule,
    CampaignsModule,
    QueueModule,
    ResearchModule,
    StrategyModule,
    ContentModule,
    EditorialModule,
    MediaModule,
    TelegramModule,
    PublisherModule,
    VideoModule,
    AnalyticsModule,
    PlansModule,
    InvitationsModule,
    OnboardingModule,
    AdminModule,
    PartnerModule,
    CredentialsModule,
    PersonasModule,
    ProfilesModule,
    VisualStylesModule,
    UserMediaModule,
    MediaFoldersModule,
    SchedulesModule,
    EmailModule,
    PaypalModule,
    AlertsModule,
    ChurnModule,
    ObservabilityModule,
    LearningModule,
    StrategistModule,
    TrendsModule,
    ExperimentsModule,
    BrandMemoryModule,
    ReferenceCopyModule,
    SourceTrustModule,
    PlaybookModule,
    BusinessProfileModule,
    BusinessBriefsModule,
    CreditsModule,
    WeeklyPlannerModule,
    SupportModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
