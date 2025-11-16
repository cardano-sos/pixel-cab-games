import { NextRequest, NextResponse } from 'next/server';
import { createSession, setSessionCookie, isAdminUser } from '@/lib/auth/session';

/**
 * Discord OAuth Callback Endpoint
 * Exchanges authorization code for access token
 * GET /api/auth/discord/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/admin?error=access_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/admin?error=no_code`
    );
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Discord OAuth not configured' },
      { status: 500 }
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        `${request.nextUrl.origin}/admin?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('User fetch failed:', await userResponse.text());
      return NextResponse.redirect(
        `${request.nextUrl.origin}/admin?error=user_fetch_failed`
      );
    }

    const discordUser = await userResponse.json();

    // Check if user is admin
    if (!isAdminUser(discordUser.id)) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/admin?error=not_admin&userId=${discordUser.id}`
      );
    }

    // Create session
    const sessionToken = await createSession({
      id: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar: discordUser.avatar,
      email: discordUser.email,
    });

    // Set session cookie and redirect to admin page
    const response = NextResponse.redirect(`${request.nextUrl.origin}/admin?success=true`);
    await setSessionCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/admin?error=unexpected&message=${encodeURIComponent(error.message)}`
    );
  }
}
