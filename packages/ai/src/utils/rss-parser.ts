// ============================================================
// RSS / Feed Parser — utilidad para fetchear y parsear feeds RSS/Atom
// ============================================================

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  content: string;
  source: string;
}

/**
 * Parsea un feed RSS/Atom desde una URL.
 * Usa regex-based parsing para evitar dependencias externas pesadas.
 */
export async function fetchRSSFeed(
  url: string,
  sourceName: string,
): Promise<RSSItem[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AutomatismosBot/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed (${response.status}): ${url}`);
  }

  const xml = await response.text();
  return parseRSSXml(xml, sourceName);
}

/**
 * Parsea XML de RSS/Atom con regex (sin dependencia de DOMParser en Node)
 */
function parseRSSXml(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Intentar RSS 2.0 primero
  const rssItemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  for (const match of rssItemMatches) {
    const itemXml = match[1] ?? '';
    items.push({
      title: extractTag(itemXml, 'title'),
      link: extractTag(itemXml, 'link'),
      description: stripHtml(extractTag(itemXml, 'description')),
      pubDate: extractTag(itemXml, 'pubDate') || null,
      content: stripHtml(
        extractTag(itemXml, 'content:encoded') ||
          extractTag(itemXml, 'description'),
      ),
      source: sourceName,
    });
  }

  // Si no se encontraron items RSS, intentar Atom
  if (items.length === 0) {
    const atomEntryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi);
    for (const match of atomEntryMatches) {
      const entryXml = match[1] ?? '';
      const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>(?:<\/link>)?/);
      items.push({
        title: extractTag(entryXml, 'title'),
        link: linkMatch?.[1] ?? '',
        description: stripHtml(extractTag(entryXml, 'summary')),
        pubDate: extractTag(entryXml, 'published') || extractTag(entryXml, 'updated') || null,
        content: stripHtml(
          extractTag(entryXml, 'content') || extractTag(entryXml, 'summary'),
        ),
        source: sourceName,
      });
    }
  }

  return items;
}

/**
 * Extrae el contenido de un tag XML
 */
function extractTag(xml: string, tag: string): string {
  // Soporta CDATA
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    'i',
  );
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch?.[1]) return cdataMatch[1].trim();

  // Tag normal
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? '';
}

/**
 * Elimina tags HTML de un string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
