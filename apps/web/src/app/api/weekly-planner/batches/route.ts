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

/** GET /api/weekly-planner/batches */
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get('limit') || '10';
  const res = await fetch(`${API}/api/weekly-planner/batches?limit=${encodeURIComponent(limit)}`, {
    headers: await getHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
