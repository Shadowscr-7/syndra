import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access_token')?.value;
  const wsId = cookieStore.get('workspace-id')?.value;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  if (wsId) headers['x-workspace-id'] = wsId;
  return headers;
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API}/api/workspaces/operation-mode`, {
    method: 'PATCH',
    headers: await getHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
