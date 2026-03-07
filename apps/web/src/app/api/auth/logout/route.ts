import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-user-id');
  cookieStore.delete('auth-email');
  cookieStore.delete('workspace-id');
  return NextResponse.json({ ok: true });
}
