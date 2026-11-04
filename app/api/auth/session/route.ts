import { NextResponse } from 'next/server';
import { currentUser, privateHeaders } from '@/lib/auth/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  // Deliberately expose only display identity and grant status, never provider tokens.
  return NextResponse.json({ session: await currentUser() }, { headers: privateHeaders });
}
