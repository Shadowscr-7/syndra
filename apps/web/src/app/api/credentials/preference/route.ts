import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access_token')?.value;
  const wsId = req.headers.get('x-workspace-id') || '';
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

/** GET /api/credentials/preference — Get credential source preference */
export async function GET(req: NextRequest) {
  const res = await fetch(`${API}/api/credentials/preference`, {
    headers: await getHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** PUT /api/credentials/preference — Set credential source preference */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API}/api/credentials/preference`, {
    method: 'PUT',
    headers: await getHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
