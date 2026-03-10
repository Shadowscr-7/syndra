import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function proxyHeaders(req: NextRequest) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    cookie: req.headers.get('cookie') || '',
  };
  const wsId = req.headers.get('x-workspace-id');
  if (wsId) headers['x-workspace-id'] = wsId;
  return headers;
}

/** GET /api/credits/balance */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/credits', '/api/credits');
    const search = url.search;
    const apiRes = await fetch(`${API_URL}${path}${search}`, {
      headers: await proxyHeaders(req),
    });
    const data = await apiRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: apiRes.status });
  } catch (error: any) {
    console.error('[Credits Proxy GET]', error);
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}

/** POST /api/credits (purchase / capture) — not used at root, but fallback */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiRes = await fetch(`${API_URL}/api/credits`, {
      method: 'POST',
      headers: await proxyHeaders(req),
      body: JSON.stringify(body),
    });
    const data = await apiRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: apiRes.status });
  } catch (error: any) {
    console.error('[Credits Proxy POST]', error);
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}
