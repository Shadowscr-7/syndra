import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/api/credits/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
        ...(req.headers.get('x-workspace-id')
          ? { 'x-workspace-id': req.headers.get('x-workspace-id')! }
          : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Credits Purchase Proxy]', error);
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}
