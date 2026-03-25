import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function proxyHeaders(req: NextRequest) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const cookieStore = await cookies();
  const token = req.headers.get('authorization') || cookieStore.get('access_token')?.value;
  if (token) h['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  const ws = req.headers.get('x-workspace-id');
  if (ws) h['x-workspace-id'] = ws;
  return h;
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const sub = path.join('/');
    const qs = req.nextUrl.search;
    const url = `${API_URL}/api/business-profile/${sub}${qs}`;
    const res = await fetch(url, {
      method: req.method,
      headers: await proxyHeaders(req),
      ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: await req.text() } : {}),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[BusinessProfile Proxy]', error);
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
