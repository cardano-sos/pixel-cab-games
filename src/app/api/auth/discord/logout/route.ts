import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

/**
 * Discord OAuth Logout Endpoint
 * Clears the user's session
 * GET /api/auth/discord/logout
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(`${request.nextUrl.origin}/admin?logout=true`);
  await clearSession(response);
  return response;
}
