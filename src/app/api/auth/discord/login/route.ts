import { NextRequest, NextResponse } from 'next/server';

/**
 * Discord OAuth Login Endpoint
 * Redirects user to Discord for authentication
 * GET /api/auth/discord/login
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/discord/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Discord OAuth not configured. Missing DISCORD_CLIENT_ID' },
      { status: 500 }
    );
  }

  // Build Discord OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
  });

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

  // Redirect to Discord
  return NextResponse.redirect(discordAuthUrl);
}
