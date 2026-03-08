import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Proxy GET /api/auth/plans → NestJS /api/auth/plans
 */
export async function GET() {
  try {
    const apiRes = await fetch(`${API_URL}/api/auth/plans`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (error) {
    console.error('[Plans Proxy]', error);
    return NextResponse.json(
      { error: 'Error al obtener los planes' },
      { status: 502 },
    );
  }
}
