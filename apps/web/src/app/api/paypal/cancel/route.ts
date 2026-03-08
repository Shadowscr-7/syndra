import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** POST /api/paypal/cancel — Cancel PayPal subscription */
export async function POST(req: NextRequest) {
  try {
    const cookies = req.headers.get('cookie') || '';
    const body = await req.json();

    const apiRes = await fetch(`${API_URL}/api/paypal/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookies,
      },
      body: JSON.stringify(body),
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (error: any) {
    console.error('[PayPal Cancel Proxy]', error);
    return NextResponse.json(
      { error: 'Error de conexión con el servidor' },
      { status: 502 },
    );
  }
}
