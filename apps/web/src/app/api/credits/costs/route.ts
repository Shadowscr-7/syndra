import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/api/credits/costs`, {
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
        ...(req.headers.get('x-workspace-id')
          ? { 'x-workspace-id': req.headers.get('x-workspace-id')! }
          : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Credits Costs Proxy]', error);
    return NextResponse.json({ error: 'API connection error' }, { status: 502 });
  }
}
