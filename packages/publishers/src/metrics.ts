// ============================================================
// Meta Insights API — Fetch engagement metrics for publications
// ============================================================
// IG Media Insights: GET /{media-id}/insights?metric=...
// FB Post Insights:  GET /{post-id}/insights?metric=...
// ============================================================

import type { MetaCredentials } from './types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/** Raw metrics returned from Meta Insights API */
export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

/**
 * Fetches engagement metrics for an Instagram media object.
 * Requires: instagram_manage_insights permission.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/reference/ig-media/insights
 */
export async function fetchInstagramMetrics(
  mediaId: string,
  credentials: MetaCredentials,
): Promise<PostMetrics> {
  const metrics = 'likes,comments,shares,saved,reach,impressions';
  const url = `${GRAPH_API_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${credentials.accessToken}`;

  try {
    const resp = await fetch(url);
    const data = (await resp.json()) as {
      data?: Array<{ name: string; values: Array<{ value: number }> }>;
      error?: { message: string };
    };

    if (!resp.ok || data.error) {
      console.warn(`[MetaMetrics] IG insights error for ${mediaId}:`, data.error?.message);
      return emptyMetrics();
    }

    return parseInsightsResponse(data.data ?? []);
  } catch (err) {
    console.warn(`[MetaMetrics] Failed to fetch IG metrics for ${mediaId}:`, err);
    return emptyMetrics();
  }
}

/**
 * Fetches engagement metrics for a Facebook post.
 * Uses post-level insights + reactions count.
 *
 * @see https://developers.facebook.com/docs/graph-api/reference/post/insights
 */
export async function fetchFacebookMetrics(
  postId: string,
  credentials: MetaCredentials,
): Promise<PostMetrics> {
  const metrics =
    'post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total,post_clicks';

  const url = `${GRAPH_API_BASE}/${postId}/insights?metric=${metrics}&access_token=${credentials.accessToken}`;

  try {
    const resp = await fetch(url);
    const data = (await resp.json()) as {
      data?: Array<{ name: string; values: Array<{ value: unknown }> }>;
      error?: { message: string };
    };

    if (!resp.ok || data.error) {
      console.warn(`[MetaMetrics] FB insights error for ${postId}:`, data.error?.message);
      return emptyMetrics();
    }

    return parseFacebookInsights(data.data ?? []);
  } catch (err) {
    console.warn(`[MetaMetrics] Failed to fetch FB metrics for ${postId}:`, err);
    return emptyMetrics();
  }
}

/**
 * Fallback: fetch basic engagement from the post object fields
 * (when insights API is not available for some reason)
 */
export async function fetchPostFieldMetrics(
  postId: string,
  credentials: MetaCredentials,
): Promise<Partial<PostMetrics>> {
  const fields = 'like_count,comments_count,shares,timestamp';
  const url = `${GRAPH_API_BASE}/${postId}?fields=${fields}&access_token=${credentials.accessToken}`;

  try {
    const resp = await fetch(url);
    const data = (await resp.json()) as Record<string, unknown>;

    if (!resp.ok) return {};

    return {
      likes: Number(data['like_count'] ?? 0),
      comments: Number(data['comments_count'] ?? 0),
      shares: Number(data['shares'] ?? 0),
    };
  } catch {
    return {};
  }
}

// ── Helpers ────────────────────────────────────────────────

function parseInsightsResponse(
  insights: Array<{ name: string; values: Array<{ value: number }> }>,
): PostMetrics {
  const map = new Map<string, number>();
  for (const metric of insights) {
    const val = metric.values?.[0]?.value ?? 0;
    map.set(metric.name, typeof val === 'number' ? val : 0);
  }

  const likes = map.get('likes') ?? 0;
  const comments = map.get('comments') ?? 0;
  const shares = map.get('shares') ?? 0;
  const saves = map.get('saved') ?? 0;
  const reach = map.get('reach') ?? 1;
  const impressions = map.get('impressions') ?? 0;

  const totalEngagement = likes + comments + shares + saves;
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

  return { likes, comments, shares, saves, reach, impressions, engagementRate };
}

function parseFacebookInsights(
  insights: Array<{ name: string; values: Array<{ value: unknown }> }>,
): PostMetrics {
  const map = new Map<string, unknown>();
  for (const metric of insights) {
    map.set(metric.name, metric.values?.[0]?.value ?? 0);
  }

  const impressions = Number(map.get('post_impressions') ?? 0);
  const reach = Number(map.get('post_impressions_unique') ?? 1);
  const engaged = Number(map.get('post_engaged_users') ?? 0);

  // Reactions by type: { like: N, love: N, wow: N, ... }
  const reactions = map.get('post_reactions_by_type_total') as Record<string, number> | undefined;
  const likes = reactions
    ? Object.values(reactions).reduce((sum, v) => sum + (v || 0), 0)
    : 0;

  const engagementRate = reach > 0 ? (engaged / reach) * 100 : 0;

  return {
    likes,
    comments: 0, // FB insights don't return comment count directly in this metric
    shares: 0,
    saves: 0,
    reach,
    impressions,
    engagementRate,
  };
}

function emptyMetrics(): PostMetrics {
  return { likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0, engagementRate: 0 };
}
