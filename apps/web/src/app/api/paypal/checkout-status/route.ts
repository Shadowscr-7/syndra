import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** GET /api/paypal/checkout-status — Get subscription status */
export async function GET(req: NextRequest) {
  try {
    const cookies = req.headers.get('cookie') || '';
    const apiRes = await fetch(`${API_URL}/api/paypal/checkout-status`, {
      headers: { cookie: cookies },
    });
    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch {
    return NextResponse.json({ error: 'Connection error' }, { status: 502 });
  }
}
