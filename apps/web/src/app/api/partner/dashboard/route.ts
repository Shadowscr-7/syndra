import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access-token')?.value;
  const userId = cookieStore.get('auth-user-id')?.value;
  const workspaceId = cookieStore.get('workspace-id')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }
  if (workspaceId) {
    headers['x-workspace-id'] = workspaceId;
  }
  return headers;
}

export async function GET(req: NextRequest) {
  const res = await fetch(`${API}/api/partner/dashboard`, {
    headers: await getHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
