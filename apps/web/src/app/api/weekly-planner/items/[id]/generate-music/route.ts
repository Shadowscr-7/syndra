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

/** POST /api/weekly-planner/items/[id]/generate-music */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(
    `${API}/api/weekly-planner/items/${encodeURIComponent(id)}/generate-music`,
    {
      method: 'POST',
      headers: await getHeaders(req),
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
