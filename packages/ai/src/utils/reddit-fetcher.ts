// ============================================================
// Reddit Fetcher — obtiene posts trending de subreddits
// Usa la API pública de Reddit (JSON, sin auth, gratis)
// Límite: ~100 req/min sin credenciales OAuth
// ============================================================

import type { RSSItem } from './rss-parser';

interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  link_flair_text: string | null;
}

interface RedditListingChild {
  data: RedditPost;
}

interface RedditListing {
  data: {
    children: RedditListingChild[];
  };
}

/**
 * Fetch trending/hot posts from a subreddit using Reddit's public JSON API.
 * No API key needed — uses .json endpoint.
 *
 * @param subreddit - subreddit name without "r/" prefix (e.g. "marketing")
 * @param sourceName - human-readable label for the source
 * @param sort - "hot" | "top" | "new" | "rising" (default: "hot")
 * @param limit - max posts to fetch (default: 15, max: 100)
 */
export async function fetchRedditTrending(
  subreddit: string,
  sourceName: string,
  sort: string = 'hot',
  limit: number = 15,
): Promise<RSSItem[]> {
  // Sanitize subreddit name — strip r/ prefix and any non-alphanumeric/underscore chars
  const cleanSub = subreddit.replace(/^r\//, '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleanSub) {
    throw new Error(`Invalid subreddit name: "${subreddit}"`);
  }

  const validSorts = new Set(['hot', 'top', 'new', 'rising']);
  const cleanSort = validSorts.has(sort) ? sort : 'hot';
  const clampedLimit = Math.min(Math.max(1, limit), 100);

  const url = `https://www.reddit.com/r/${encodeURIComponent(cleanSub)}/${cleanSort}.json?limit=${clampedLimit}&t=week`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AutomatismosBot/1.0 (trend detection)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Reddit fetch failed (${response.status}): r/${cleanSub}`);
  }

  const data: RedditListing = await response.json();
  const children = data?.data?.children ?? [];

  return children
    .filter((c) => c.data && !c.data.url?.includes('/comments/')) // Skip self-referencing
    .map((c): RSSItem => {
      const post = c.data;
      const permalink = `https://www.reddit.com${post.permalink}`;
      const published = new Date(post.created_utc * 1000);

      return {
        title: post.title,
        link: post.url?.startsWith('http') ? post.url : permalink,
        description: truncate(post.selftext || post.title, 300),
        pubDate: published.toISOString(),
        content: post.selftext || post.title,
        source: sourceName || `r/${cleanSub}`,
      };
    });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}
