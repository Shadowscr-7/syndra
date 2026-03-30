import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access_token')?.value;
  const wsId =
    req.headers.get('x-workspace-id') ||
    cookieStore.get('workspace-id')?.value;
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

async function handler(req: NextRequest) {
  try {
    const qs = req.nextUrl.search;
    const url = `${API}/api/reference-copy${qs}`;
    const isGet = req.method === 'GET' || req.method === 'HEAD';
    const res = await fetch(url, {
      method: req.method,
      headers: await getHeaders(req),
      ...(!isGet && { body: await req.text() }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
