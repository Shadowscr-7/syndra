import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access_token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }
  return headers;
}

/** GET /api/profiles — List profiles */
export async function GET(req: NextRequest) {
  const res = await fetch(`${API}/api/profiles`, {
    headers: await getHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** POST /api/profiles — Create profile */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API}/api/profiles`, {
    method: 'POST',
    headers: await getHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
