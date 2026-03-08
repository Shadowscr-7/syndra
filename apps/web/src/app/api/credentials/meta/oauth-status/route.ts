import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getHeaders(req: NextRequest) {
  const cookieStore = await cookies();
  const token =
    req.headers.get('authorization') ||
    cookieStore.get('access_token')?.value;

  // Resolve workspace: prefer cookie, fallback to DB lookup
  let wsId = cookieStore.get('workspace-id')?.value;
  if (!wsId) {
    const userId = cookieStore.get('auth-user-id')?.value;
    if (userId) {
      try {
        const wu = await prisma.workspaceUser.findFirst({
          where: { userId },
          orderBy: { isDefault: 'desc' },
          select: { workspaceId: true },
        });
        if (wu) wsId = wu.workspaceId;
      } catch { /* DB not available */ }
    }
  }
  if (!wsId) wsId = 'ws_default';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-workspace-id': wsId,
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }
  return headers;
}

/** GET /api/credentials/meta/oauth-status */
export async function GET(req: NextRequest) {
  const res = await fetch(`${API}/api/credentials/meta/oauth-status`, {
    headers: await getHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** DELETE /api/credentials/meta/oauth — disconnect */
export async function DELETE(req: NextRequest) {
  const res = await fetch(`${API}/api/credentials/meta/oauth`, {
    method: 'DELETE',
    headers: await getHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
