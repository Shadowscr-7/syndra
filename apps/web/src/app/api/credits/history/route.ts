import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access_token')?.value;
  const wsId =
    req.headers.get('x-workspace-id') ||
    cookieStore.get('workspace-id')?.value ||
    '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }
  if (wsId) headers['x-workspace-id'] = wsId;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.search; // Forward query params like ?limit=50
    const res = await fetch(`${API_URL}/api/credits/history${search}`, {
      headers: await getHeaders(req),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Credits History Proxy]', error);
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}
