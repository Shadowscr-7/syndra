-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COLLABORATOR', 'USER');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "BriefType" AS ENUM ('PRODUCT', 'SERVICE', 'OFFER', 'ANNOUNCEMENT', 'TESTIMONIAL', 'FAQ', 'SEASONAL', 'BRAND_STORY');

-- CreateEnum
CREATE TYPE "ThemeType" AS ENUM ('TRENDING', 'EVERGREEN', 'PRODUCT', 'SERVICE', 'OFFER', 'SEASONAL', 'TESTIMONIAL', 'BEHIND_SCENES', 'EDUCATIONAL', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('AUTHORITY', 'TRAFFIC', 'LEAD_CAPTURE', 'SALE', 'COMMUNITY', 'ENGAGEMENT', 'PROMOTION', 'PRODUCT_LAUNCH', 'SEASONAL_SALE', 'BRAND_AWARENESS', 'CATALOG');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RSS', 'BLOG', 'NEWSLETTER', 'SOCIAL', 'CHANGELOG', 'CUSTOM', 'PRODUCT_CATALOG', 'BUSINESS_BRIEF', 'OFFER_CALENDAR', 'FAQ', 'TESTIMONIALS_SOURCE');

-- CreateEnum
CREATE TYPE "EditorialRunStatus" AS ENUM ('PENDING', 'RESEARCH', 'STRATEGY', 'CONTENT', 'MEDIA', 'COMPLIANCE', 'REVIEW', 'APPROVED', 'PUBLISHING', 'PUBLISHED', 'REJECTED', 'FAILED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('POST', 'CAROUSEL', 'REEL', 'STORY', 'AVATAR_VIDEO', 'HYBRID_MOTION');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'CAROUSEL_SLIDE', 'VIDEO', 'AVATAR_VIDEO', 'THUMBNAIL', 'MOTION_GRAPHIC');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'GENERATING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVED', 'CORRECT_TEXT', 'CHANGE_TONE', 'REGENERATE_IMAGE', 'CONVERT_TO_VIDEO', 'POSTPONE', 'REJECTED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'THREADS');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'RETRYING', 'NEEDS_MANUAL_ATTENTION');

-- CreateEnum
CREATE TYPE "MetricBucket" AS ENUM ('H2', 'H6', 'H24', 'H48', 'D7');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('BEST_FORMAT', 'BEST_THEME', 'BEST_TONE', 'BEST_HOUR', 'BEST_CTA', 'TREND_UP', 'TREND_DOWN', 'WEEKLY_SUMMARY', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "CredentialProvider" AS ENUM ('META', 'TELEGRAM', 'DISCORD', 'LLM', 'IMAGE_GEN', 'CLOUDINARY', 'HEYGEN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'PAUSED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('PUBLICATIONS', 'VIDEOS', 'AI_GENERATIONS', 'API_CALLS');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('AVAILABLE', 'ACTIVATED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FIRST_PURCHASE', 'RECURRING');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('USER_MGMT', 'COMMISSION', 'SUBSCRIPTION', 'LICENSE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UserCredentialProvider" AS ENUM ('LLM', 'IMAGE_GEN', 'RESEARCH', 'META', 'DISCORD', 'CLOUDINARY', 'GOOGLE_DRIVE', 'AWS_S3', 'HEYGEN', 'TELEGRAM', 'REPLICATE', 'FAL_AI', 'DID', 'HEDRA');

-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('LOGO', 'PRODUCT', 'BACKGROUND', 'PERSONAL', 'OTHER', 'PROMOTION', 'BANNER', 'OFFER_IMAGE', 'BRAND_ELEMENT');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TOKEN_EXPIRING', 'LOW_ACTIVITY', 'ENGAGEMENT_DROP', 'TREND_DETECTED', 'PUBLISH_ERROR', 'CREDENTIALS_BROKEN', 'CAMPAIGN_NO_SOURCES', 'ONBOARDING_STALLED', 'HIGH_FATIGUE', 'PLAN_LIMIT_NEAR', 'PIPELINE_FAILURE_RATE', 'CHURN_AT_RISK');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ChurnStatus" AS ENUM ('MONITORING', 'AT_RISK', 'CHURNED', 'HEALTHY');

-- CreateEnum
CREATE TYPE "OperationMode" AS ENUM ('FULLY_AUTOMATIC', 'APPROVAL_REQUIRED', 'MANUAL');

-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('ACTIVE', 'LOW_DATA', 'DISABLED');

-- CreateEnum
CREATE TYPE "PatternDimension" AS ENUM ('THEME', 'FORMAT', 'TONE', 'CTA', 'HOUR', 'DAY', 'VISUAL_STYLE', 'HOOK_TYPE', 'LENGTH');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('UP', 'DOWN', 'FLAT');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('CHOOSE_TONE', 'CHOOSE_FORMAT', 'CHOOSE_HOUR', 'CHOOSE_THEME', 'CHOOSE_CTA', 'CHOOSE_HOOK', 'AVOID_FATIGUE', 'BOOST_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "PlanPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "StrategyPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('POST_COUNT', 'FORMAT', 'TONE', 'HOUR', 'THEME', 'CTA', 'TREND', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('NEW', 'DISMISSED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExperimentType" AS ENUM ('TONE', 'FORMAT', 'CTA', 'HOOK', 'HOUR', 'IMAGE_STYLE');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('HEYGEN', 'PIKA', 'LUMA', 'SVD_LOCAL', 'WAN_LOCAL', 'HUNYUAN_LOCAL', 'EDGE_TTS_COMPOSE', 'REPLICATE_WAN', 'FAL_WAN', 'LUMA_RAY', 'DID', 'HEDRA', 'MOCK');

-- CreateEnum
CREATE TYPE "VideoTier" AS ENUM ('MVP', 'SELFHOST', 'PREMIUM');

-- CreateEnum
CREATE TYPE "VideoInputType" AS ENUM ('IMAGE_TO_VIDEO', 'TEXT_TO_VIDEO', 'SCRIPT_WITH_VOICE', 'AVATAR_TALKING', 'CAROUSEL_ANIMATION');

-- CreateEnum
CREATE TYPE "VideoJobStatus" AS ENUM ('QUEUED', 'RENDERING', 'COMPOSING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditSource" AS ENUM ('PLAN', 'PURCHASE', 'ADDON', 'PROMO', 'REFUND');

-- CreateEnum
CREATE TYPE "CreditOperationType" AS ENUM ('IMAGE_STANDARD', 'IMAGE_TEXT', 'IMAGE_HD', 'ANIMATION_5S', 'ANIMATION_10S', 'VIDEO_REEL_10S', 'VIDEO_REEL_15S', 'AVATAR_BASIC_30S', 'AVATAR_PREMIUM_30S', 'VOICE_PREMIUM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "referred_by_code" TEXT,
    "referral_code" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "logo_url" TEXT,
    "primary_color" TEXT,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active_channels" TEXT[] DEFAULT ARRAY['instagram', 'facebook']::TEXT[],
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "industry" TEXT,
    "operation_mode" "OperationMode" NOT NULL DEFAULT 'APPROVAL_REQUIRED',
    "learning_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'OWNER',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'didáctico',
    "allowed_claims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "base_cta" TEXT NOT NULL DEFAULT '',
    "prohibited_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topic_whitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topic_blacklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visual_style" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL DEFAULT '',
    "business_type" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "slogan" TEXT,
    "usp" TEXT,
    "target_market" TEXT NOT NULL DEFAULT '',
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_range" TEXT,
    "website_url" TEXT,
    "physical_address" TEXT,
    "phone_number" TEXT,
    "social_links" JSONB,
    "brand_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logo_media_id" TEXT,
    "promotion_style" TEXT NOT NULL DEFAULT 'balanced',
    "content_goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_briefs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "BriefType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "product_name" TEXT,
    "product_price" TEXT,
    "product_url" TEXT,
    "discount_text" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "media_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_themes" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "preferred_formats" TEXT[] DEFAULT ARRAY['post', 'carousel']::TEXT[],
    "type" "ThemeType" NOT NULL DEFAULT 'EVERGREEN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "product_name" TEXT,
    "product_description" TEXT,
    "product_price" TEXT,
    "product_url" TEXT,
    "product_media_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promotion_start" TIMESTAMP(3),
    "promotion_end" TIMESTAMP(3),
    "discount_text" TEXT,

    CONSTRAINT "content_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL,
    "offer" TEXT,
    "landing_url" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "kpi_target" TEXT,
    "content_profile_id" TEXT,
    "user_persona_id" TEXT,
    "target_channels" TEXT[] DEFAULT ARRAY['instagram']::TEXT[],
    "channel_formats" JSONB,
    "operation_mode" "OperationMode",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_themes" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,

    CONSTRAINT "campaign_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_sources" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_snapshots" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "key_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggested_angle" TEXT,
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "raw_data_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_runs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EditorialRunStatus" NOT NULL DEFAULT 'PENDING',
    "origin" TEXT NOT NULL DEFAULT 'scheduler',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "error_message" TEXT,
    "research_summary" TEXT,
    "publish_window" TIMESTAMP(3),
    "target_channels" TEXT[] DEFAULT ARRAY['instagram']::TEXT[],
    "content_profile_id" TEXT,
    "user_persona_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorial_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_briefs" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "theme_id" TEXT,
    "angle" TEXT NOT NULL DEFAULT '',
    "format" "ContentFormat" NOT NULL DEFAULT 'POST',
    "cta" TEXT NOT NULL DEFAULT '',
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seed_prompt" TEXT NOT NULL DEFAULT '',
    "objective" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT 'didáctico',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "hook" TEXT NOT NULL DEFAULT '',
    "copy" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "score" DOUBLE PRECISION,
    "human_feedback" TEXT,
    "llm_prompt_used" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "content_version_id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "prompt" TEXT,
    "provider" TEXT,
    "original_url" TEXT,
    "optimized_url" TEXT,
    "thumbnail_url" TEXT,
    "storage_path" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_events" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "comment" TEXT,
    "telegram_chat_id" TEXT,
    "telegram_msg_id" TEXT,
    "approved_by" TEXT,
    "version_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_post_id" TEXT,
    "permalink" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'QUEUED',
    "payload_sent" JSONB,
    "api_response" JSONB,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION,
    "metrics_updated_at" TIMESTAMP(3),

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "bucket" "MetricBucket" NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_insights" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data" JSONB,
    "score" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "performance_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queue_logs" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT,
    "job_type" TEXT NOT NULL,
    "queue" TEXT NOT NULL DEFAULT 'editorial_jobs',
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "latency_ms" INTEGER,
    "payload" JSONB,
    "result" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_queue_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_credentials" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" "CredentialProvider" NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "monthly_price" INTEGER NOT NULL DEFAULT 0,
    "yearly_price" INTEGER NOT NULL DEFAULT 0,
    "max_publications" INTEGER NOT NULL DEFAULT 30,
    "max_videos" INTEGER NOT NULL DEFAULT 0,
    "max_sources" INTEGER NOT NULL DEFAULT 3,
    "max_channels" INTEGER NOT NULL DEFAULT 2,
    "max_editors" INTEGER NOT NULL DEFAULT 1,
    "max_personas" INTEGER NOT NULL DEFAULT 1,
    "max_content_profiles" INTEGER NOT NULL DEFAULT 1,
    "max_visual_styles" INTEGER NOT NULL DEFAULT 1,
    "max_storage_mb" INTEGER NOT NULL DEFAULT 500,
    "max_schedule_slots" INTEGER NOT NULL DEFAULT 5,
    "max_experiments" INTEGER NOT NULL DEFAULT 0,
    "analytics_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ai_scoring_enabled" BOOLEAN NOT NULL DEFAULT false,
    "trend_detection_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ai_strategist_enabled" BOOLEAN NOT NULL DEFAULT false,
    "video_enabled" BOOLEAN NOT NULL DEFAULT false,
    "brand_memory_enabled" BOOLEAN NOT NULL DEFAULT false,
    "team_enabled" BOOLEAN NOT NULL DEFAULT false,
    "priority_queue" BOOLEAN NOT NULL DEFAULT false,
    "api_access" BOOLEAN NOT NULL DEFAULT false,
    "priority_support" BOOLEAN NOT NULL DEFAULT false,
    "custom_branding" BOOLEAN NOT NULL DEFAULT false,
    "analytics_level" TEXT NOT NULL DEFAULT 'basic',
    "learning_loop_level" TEXT NOT NULL DEFAULT 'none',
    "autopilot_level" TEXT NOT NULL DEFAULT 'manual',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "paypal_subscription_id" TEXT,
    "paypal_customer_id" TEXT,
    "paypal_plan_id" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_sub_id" TEXT,
    "discount_percent" INTEGER NOT NULL DEFAULT 0,
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "status" "LicenseStatus" NOT NULL DEFAULT 'AVAILABLE',
    "max_activations" INTEGER NOT NULL DEFAULT 1,
    "activation_count" INTEGER NOT NULL DEFAULT 0,
    "batch_name" TEXT,
    "buyer_email" TEXT,
    "buyer_name" TEXT,
    "notes" TEXT DEFAULT '',
    "activated_by" TEXT,
    "activated_at" TIMESTAMP(3),
    "workspace_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL DEFAULT 'manual',
    "reference" TEXT,
    "description" TEXT,
    "license_key_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_referrals" (
    "id" TEXT NOT NULL,
    "collaborator_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "subscription_id" TEXT,
    "plan_name" TEXT,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "commission_percent" INTEGER NOT NULL DEFAULT 20,
    "commission_amount" INTEGER NOT NULL DEFAULT 0,
    "commission_type" "CommissionType" NOT NULL DEFAULT 'FIRST_PURCHASE',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "payout_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payouts" (
    "id" TEXT NOT NULL,
    "collaborator_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "referral_count" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_number" TEXT,
    "generated_by" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL DEFAULT 'SYSTEM',
    "performed_by" TEXT NOT NULL,
    "target_id" TEXT,
    "target_type" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "UserCredentialProvider" NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "last_test_result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_personas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL DEFAULT '',
    "brand_description" TEXT NOT NULL DEFAULT '',
    "tone" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visual_style" TEXT NOT NULL DEFAULT '',
    "target_audience" TEXT NOT NULL DEFAULT '',
    "avoid_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language_style" TEXT NOT NULL DEFAULT '',
    "example_phrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'didáctico',
    "content_length" TEXT NOT NULL DEFAULT 'MEDIUM',
    "audience" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'es',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posting_goal" TEXT NOT NULL DEFAULT '',
    "linked_social_accounts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visual_style_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_profile_id" TEXT,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'MINIMALIST',
    "color_palette" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primary_font" TEXT,
    "secondary_font" TEXT,
    "logo_url" TEXT,
    "preferred_image_provider" TEXT NOT NULL DEFAULT 'huggingface',
    "custom_prompt_prefix" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visual_style_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_media" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" "MediaCategory" NOT NULL DEFAULT 'OTHER',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "product_name" TEXT,
    "product_sku" TEXT,
    "product_price" TEXT,
    "product_url" TEXT,
    "product_description" TEXT,
    "use_in_pipeline" BOOLEAN NOT NULL DEFAULT false,
    "is_logo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_profile_id" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Mi horario',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "operation_mode" "OperationMode",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "time" TEXT NOT NULL,
    "social_account_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_alerts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggested_action" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "churn_risk_signals" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "last_calculated_at" TIMESTAMP(3),
    "status" "ChurnStatus" NOT NULL DEFAULT 'MONITORING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "churn_risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_playbooks" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏪',
    "description" TEXT NOT NULL DEFAULT '',
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audiences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule_hint" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_learning_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "platform" TEXT,
    "audience_segment" TEXT,
    "last_calculated_at" TIMESTAMP(3),
    "data_window_days" INTEGER NOT NULL DEFAULT 30,
    "minimum_data_threshold" INTEGER NOT NULL DEFAULT 5,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "LearningStatus" NOT NULL DEFAULT 'LOW_DATA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_learning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pattern_scores" (
    "id" TEXT NOT NULL,
    "learning_profile_id" TEXT NOT NULL,
    "dimension_type" "PatternDimension" NOT NULL,
    "dimension_value" TEXT NOT NULL,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_reach" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_saves" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_comments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weighted_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trend_direction" "TrendDirection" NOT NULL DEFAULT 'FLAT',
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pattern_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_decision_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "editorial_run_id" TEXT,
    "decision_type" "DecisionType" NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "reason_summary" TEXT NOT NULL,
    "source_pattern_ids" JSONB NOT NULL DEFAULT '[]',
    "before_value" TEXT,
    "after_value" TEXT,
    "impact_prediction" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_plans" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "periodType" "PlanPeriod" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "objective" TEXT,
    "summary" TEXT,
    "recommended_theme_mix" JSONB,
    "recommended_format_mix" JSONB,
    "recommended_tone_mix" JSONB,
    "recommended_posting_windows" JSONB,
    "recommended_ctas" JSONB,
    "trend_references" JSONB,
    "weekly_post_target" INTEGER NOT NULL DEFAULT 5,
    "status" "StrategyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL DEFAULT 'SYSTEM',
    "impact_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_recommendations" (
    "id" TEXT NOT NULL,
    "strategy_plan_id" TEXT NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommended_action" TEXT,
    "source_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_signals" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "theme_label" TEXT NOT NULL,
    "normalized_topic" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "headline" TEXT,
    "excerpt" TEXT,
    "published_at" TIMESTAMP(3),
    "novelty_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "momentum_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "brand_fit_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagement_potential_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "urgency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommended_window_hours" INTEGER NOT NULL DEFAULT 12,
    "suggested_angle" TEXT,
    "status" "TrendStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_experiments" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "editorial_run_id" TEXT,
    "experiment_type" "ExperimentType" NOT NULL,
    "hypothesis" TEXT,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'RUNNING',
    "winner_variant_id" TEXT,
    "conclusion" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_experiment_variants" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "variant_config" JSONB NOT NULL,
    "publication_id" TEXT,
    "performance_score" DOUBLE PRECISION,
    "metrics" JSONB,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_memories" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "frequent_phrases" JSONB NOT NULL DEFAULT '[]',
    "used_claims" JSONB NOT NULL DEFAULT '[]',
    "used_ctas" JSONB NOT NULL DEFAULT '[]',
    "overused_words" JSONB NOT NULL DEFAULT '[]',
    "exploited_themes" JSONB NOT NULL DEFAULT '[]',
    "last_analyzed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_fatigue_scores" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "dimension_type" "PatternDimension" NOT NULL,
    "dimension_value" TEXT NOT NULL,
    "recent_usage_count" INTEGER NOT NULL DEFAULT 0,
    "fatigue_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suggested_cooldown_days" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_fatigue_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_trust_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "is_whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "total_articles" INTEGER NOT NULL DEFAULT 0,
    "accuracy_rate" DOUBLE PRECISION,
    "last_evaluated_at" TIMESTAMP(3),
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_trust_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_traces" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "source_url" TEXT,
    "source_domain" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_created_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "workspace_configured_at" TIMESTAMP(3),
    "brand_configured_at" TIMESTAMP(3),
    "channels_connected_at" TIMESTAMP(3),
    "themes_configured_at" TIMESTAMP(3),
    "sources_added_at" TIMESTAMP(3),
    "llm_configured_at" TIMESTAMP(3),
    "telegram_linked_at" TIMESTAMP(3),
    "persona_created_at" TIMESTAMP(3),
    "profile_created_at" TIMESTAMP(3),
    "first_run_triggered_at" TIMESTAMP(3),
    "first_publication_at" TIMESTAMP(3),
    "last_nudge_sent_at" TIMESTAMP(3),
    "nudge_count" INTEGER NOT NULL DEFAULT 0,
    "nudge_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 13,
    "percent_complete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_comments" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_assignments" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "assigned_user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REVIEWER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "editorial_run_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "approver_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_playbooks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "formatMix" JSONB NOT NULL DEFAULT '[]',
    "base_prompts" JSONB,
    "schedule_config" JSONB,
    "preferred_ctas" JSONB,
    "visual_styles" JSONB,
    "source_types" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_render_jobs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "editorial_run_id" TEXT,
    "provider" "VideoProvider" NOT NULL,
    "tier" "VideoTier" NOT NULL,
    "input_type" "VideoInputType" NOT NULL,
    "input_payload" JSONB NOT NULL,
    "output_url" TEXT,
    "thumbnail_url" TEXT,
    "duration_seconds" INTEGER,
    "aspect_ratio" TEXT NOT NULL DEFAULT '9:16',
    "status" "VideoJobStatus" NOT NULL DEFAULT 'QUEUED',
    "external_job_id" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "credits_used" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_render_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_credits" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "total_credits" INTEGER NOT NULL DEFAULT 0,
    "used_credits" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PLAN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credits" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "source" "CreditSource" NOT NULL,
    "operation" "CreditOperationType",
    "description" TEXT,
    "reference_id" TEXT,
    "paypal_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_balances" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "total_purchased" INTEGER NOT NULL DEFAULT 0,
    "total_consumed" INTEGER NOT NULL DEFAULT 0,
    "total_refunded" INTEGER NOT NULL DEFAULT 0,
    "current_balance" INTEGER NOT NULL DEFAULT 0,
    "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT,
    "voice_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_users_user_id_workspace_id_key" ON "workspace_users"("user_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_workspace_id_key" ON "brand_profiles"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_workspace_id_key" ON "business_profiles"("workspace_id");

-- CreateIndex
CREATE INDEX "business_briefs_workspace_id_is_active_idx" ON "business_briefs"("workspace_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_themes_campaign_id_theme_id_key" ON "campaign_themes"("campaign_id", "theme_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_briefs_editorial_run_id_key" ON "content_briefs"("editorial_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_publication_id_bucket_key" ON "metric_snapshots"("publication_id", "bucket");

-- CreateIndex
CREATE UNIQUE INDEX "api_credentials_workspace_id_provider_key" ON "api_credentials"("workspace_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspace_id_key" ON "subscriptions"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_workspace_id_email_key" ON "invitations"("workspace_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_workspace_id_metric_period_start_key" ON "usage_records"("workspace_id", "metric", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_key_key" ON "license_keys"("key");

-- CreateIndex
CREATE INDEX "license_keys_status_idx" ON "license_keys"("status");

-- CreateIndex
CREATE INDEX "license_keys_buyer_email_idx" ON "license_keys"("buyer_email");

-- CreateIndex
CREATE INDEX "payment_logs_workspace_id_idx" ON "payment_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "affiliate_referrals_collaborator_id_idx" ON "affiliate_referrals"("collaborator_id");

-- CreateIndex
CREATE INDEX "affiliate_referrals_status_idx" ON "affiliate_referrals"("status");

-- CreateIndex
CREATE INDEX "affiliate_referrals_commission_type_idx" ON "affiliate_referrals"("commission_type");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_referrals_referred_user_id_commission_type_period_key" ON "affiliate_referrals"("referred_user_id", "commission_type", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "commission_payouts_invoice_number_key" ON "commission_payouts"("invoice_number");

-- CreateIndex
CREATE INDEX "commission_payouts_collaborator_id_idx" ON "commission_payouts"("collaborator_id");

-- CreateIndex
CREATE INDEX "commission_payouts_status_idx" ON "commission_payouts"("status");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs"("target_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_provider_key" ON "user_credentials"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_user_id_key" ON "telegram_links"("user_id");

-- CreateIndex
CREATE INDEX "telegram_links_chat_id_idx" ON "telegram_links"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_tokens_token_key" ON "telegram_link_tokens"("token");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_token_idx" ON "telegram_link_tokens"("token");

-- CreateIndex
CREATE INDEX "user_personas_user_id_idx" ON "user_personas"("user_id");

-- CreateIndex
CREATE INDEX "content_profiles_user_id_idx" ON "content_profiles"("user_id");

-- CreateIndex
CREATE INDEX "visual_style_profiles_user_id_idx" ON "visual_style_profiles"("user_id");

-- CreateIndex
CREATE INDEX "media_folders_user_id_idx" ON "media_folders"("user_id");

-- CreateIndex
CREATE INDEX "user_media_user_id_idx" ON "user_media"("user_id");

-- CreateIndex
CREATE INDEX "user_media_folder_id_idx" ON "user_media"("folder_id");

-- CreateIndex
CREATE INDEX "user_media_category_idx" ON "user_media"("category");

-- CreateIndex
CREATE INDEX "user_media_user_id_use_in_pipeline_idx" ON "user_media"("user_id", "use_in_pipeline");

-- CreateIndex
CREATE INDEX "publish_schedules_user_id_idx" ON "publish_schedules"("user_id");

-- CreateIndex
CREATE INDEX "schedule_slots_schedule_id_idx" ON "schedule_slots"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "workspace_alerts_workspace_id_status_idx" ON "workspace_alerts"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "churn_risk_signals_workspace_id_key" ON "churn_risk_signals"("workspace_id");

-- CreateIndex
CREATE INDEX "operational_metrics_metric_date_idx" ON "operational_metrics"("metric", "date");

-- CreateIndex
CREATE UNIQUE INDEX "operational_metrics_date_metric_key" ON "operational_metrics"("date", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "industry_playbooks_slug_key" ON "industry_playbooks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_learning_profiles_workspace_id_platform_key" ON "content_learning_profiles"("workspace_id", "platform");

-- CreateIndex
CREATE INDEX "content_pattern_scores_learning_profile_id_weighted_score_idx" ON "content_pattern_scores"("learning_profile_id", "weighted_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "content_pattern_scores_learning_profile_id_dimension_type_d_key" ON "content_pattern_scores"("learning_profile_id", "dimension_type", "dimension_value");

-- CreateIndex
CREATE INDEX "learning_decision_logs_workspace_id_created_at_idx" ON "learning_decision_logs"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "strategy_plans_workspace_id_status_idx" ON "strategy_plans"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "strategy_plans_workspace_id_start_date_idx" ON "strategy_plans"("workspace_id", "start_date" DESC);

-- CreateIndex
CREATE INDEX "strategy_recommendations_strategy_plan_id_priority_score_idx" ON "strategy_recommendations"("strategy_plan_id", "priority_score" DESC);

-- CreateIndex
CREATE INDEX "trend_signals_workspace_id_status_idx" ON "trend_signals"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "trend_signals_workspace_id_final_score_idx" ON "trend_signals"("workspace_id", "final_score" DESC);

-- CreateIndex
CREATE INDEX "trend_signals_workspace_id_created_at_idx" ON "trend_signals"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "content_experiments_workspace_id_status_idx" ON "content_experiments"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "content_experiments_workspace_id_started_at_idx" ON "content_experiments"("workspace_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "content_experiment_variants_experiment_id_idx" ON "content_experiment_variants"("experiment_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_memories_workspace_id_key" ON "brand_memories"("workspace_id");

-- CreateIndex
CREATE INDEX "content_fatigue_scores_workspace_id_fatigue_score_idx" ON "content_fatigue_scores"("workspace_id", "fatigue_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "content_fatigue_scores_workspace_id_dimension_type_dimensio_key" ON "content_fatigue_scores"("workspace_id", "dimension_type", "dimension_value");

-- CreateIndex
CREATE INDEX "source_trust_profiles_workspace_id_trust_score_idx" ON "source_trust_profiles"("workspace_id", "trust_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "source_trust_profiles_workspace_id_domain_key" ON "source_trust_profiles"("workspace_id", "domain");

-- CreateIndex
CREATE INDEX "claim_traces_editorial_run_id_idx" ON "claim_traces"("editorial_run_id");

-- CreateIndex
CREATE INDEX "compliance_rules_workspace_id_is_active_idx" ON "compliance_rules"("workspace_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_workspace_id_key" ON "onboarding_progress"("workspace_id");

-- CreateIndex
CREATE INDEX "editorial_comments_editorial_run_id_idx" ON "editorial_comments"("editorial_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_assignments_editorial_run_id_assigned_user_id_key" ON "editorial_assignments"("editorial_run_id", "assigned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_editorial_run_id_step_order_key" ON "approval_steps"("editorial_run_id", "step_order");

-- CreateIndex
CREATE INDEX "content_playbooks_workspace_id_idx" ON "content_playbooks"("workspace_id");

-- CreateIndex
CREATE INDEX "video_render_jobs_workspace_id_status_idx" ON "video_render_jobs"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "video_render_jobs_status_idx" ON "video_render_jobs"("status");

-- CreateIndex
CREATE INDEX "video_credits_workspace_id_period_end_idx" ON "video_credits"("workspace_id", "period_end");

-- CreateIndex
CREATE INDEX "ai_credits_workspace_id_created_at_idx" ON "ai_credits"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_credits_workspace_id_source_idx" ON "ai_credits"("workspace_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_workspace_id_key" ON "credit_balances"("workspace_id");

-- CreateIndex
CREATE INDEX "avatar_profiles_workspace_id_idx" ON "avatar_profiles"("workspace_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_briefs" ADD CONSTRAINT "business_briefs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_themes" ADD CONSTRAINT "content_themes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_content_profile_id_fkey" FOREIGN KEY ("content_profile_id") REFERENCES "content_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_persona_id_fkey" FOREIGN KEY ("user_persona_id") REFERENCES "user_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_themes" ADD CONSTRAINT "campaign_themes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_themes" ADD CONSTRAINT "campaign_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "content_themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_snapshots" ADD CONSTRAINT "research_snapshots_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_runs" ADD CONSTRAINT "editorial_runs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_runs" ADD CONSTRAINT "editorial_runs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_runs" ADD CONSTRAINT "editorial_runs_content_profile_id_fkey" FOREIGN KEY ("content_profile_id") REFERENCES "content_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_runs" ADD CONSTRAINT "editorial_runs_user_persona_id_fkey" FOREIGN KEY ("user_persona_id") REFERENCES "user_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "content_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "content_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_content_version_id_fkey" FOREIGN KEY ("content_version_id") REFERENCES "content_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_queue_logs" ADD CONSTRAINT "job_queue_logs_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "commission_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_profiles" ADD CONSTRAINT "content_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visual_style_profiles" ADD CONSTRAINT "visual_style_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visual_style_profiles" ADD CONSTRAINT "visual_style_profiles_content_profile_id_fkey" FOREIGN KEY ("content_profile_id") REFERENCES "content_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media" ADD CONSTRAINT "user_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media" ADD CONSTRAINT "user_media_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_schedules" ADD CONSTRAINT "publish_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_schedules" ADD CONSTRAINT "publish_schedules_content_profile_id_fkey" FOREIGN KEY ("content_profile_id") REFERENCES "content_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "publish_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_alerts" ADD CONSTRAINT "workspace_alerts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "churn_risk_signals" ADD CONSTRAINT "churn_risk_signals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_learning_profiles" ADD CONSTRAINT "content_learning_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pattern_scores" ADD CONSTRAINT "content_pattern_scores_learning_profile_id_fkey" FOREIGN KEY ("learning_profile_id") REFERENCES "content_learning_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_decision_logs" ADD CONSTRAINT "learning_decision_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_decision_logs" ADD CONSTRAINT "learning_decision_logs_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_plans" ADD CONSTRAINT "strategy_plans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_recommendations" ADD CONSTRAINT "strategy_recommendations_strategy_plan_id_fkey" FOREIGN KEY ("strategy_plan_id") REFERENCES "strategy_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_experiments" ADD CONSTRAINT "content_experiments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_experiment_variants" ADD CONSTRAINT "content_experiment_variants_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "content_experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_memories" ADD CONSTRAINT "brand_memories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_fatigue_scores" ADD CONSTRAINT "content_fatigue_scores_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_trust_profiles" ADD CONSTRAINT "source_trust_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_traces" ADD CONSTRAINT "claim_traces_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_comments" ADD CONSTRAINT "editorial_comments_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_comments" ADD CONSTRAINT "editorial_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_comments" ADD CONSTRAINT "editorial_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "editorial_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_playbooks" ADD CONSTRAINT "content_playbooks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_render_jobs" ADD CONSTRAINT "video_render_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_render_jobs" ADD CONSTRAINT "video_render_jobs_editorial_run_id_fkey" FOREIGN KEY ("editorial_run_id") REFERENCES "editorial_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_credits" ADD CONSTRAINT "video_credits_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_credits" ADD CONSTRAINT "ai_credits_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatar_profiles" ADD CONSTRAINT "avatar_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
