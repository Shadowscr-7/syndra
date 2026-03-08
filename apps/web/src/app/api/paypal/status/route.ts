import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** GET /api/paypal/status — Check if PayPal is configured */
export async function GET(req: NextRequest) {
  try {
    const cookies = req.headers.get('cookie') || '';
    const apiRes = await fetch(`${API_URL}/api/paypal/status`, {
      headers: { cookie: cookies },
    });
    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch {
    return NextResponse.json({ configured: false }, { status: 200 });
  }
}
