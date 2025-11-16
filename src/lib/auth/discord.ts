/**
 * Discord Authentication for Admin Endpoints
 * Verifies Discord user tokens and checks admin permissions
 */

import { NextRequest, NextResponse } from 'next/server';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

/**
 * Verify Discord bot token by fetching bot user info
 * For user OAuth tokens, use /users/@me endpoint
 */
export async function verifyDiscordToken(token: string): Promise<DiscordUser | null> {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Discord API error:', response.status, response.statusText);
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error verifying Discord token:', error);
    return null;
  }
}

/**
 * Check if a Discord user is authorized as admin
 * Currently checks against whitelist of user IDs
 */
export function isAdminUser(userId: string): boolean {
  const adminUserIds = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];
  return adminUserIds.includes(userId);
}

/**
 * Middleware to protect admin routes with Discord authentication
 *
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireDiscordAuth(request);
 *   if (authResult.error) {
 *     return authResult.error;
 *   }
 *   const user = authResult.user;
 *   // ... your admin logic here
 * }
 * ```
 */
export async function requireDiscordAuth(request: NextRequest): Promise<{
  user?: DiscordUser;
  error?: NextResponse;
}> {
  // Check for Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return {
      error: NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      ),
    };
  }

  // Extract token (supports both "Bearer TOKEN" and "Bot TOKEN")
  const token = authHeader.replace(/^(Bearer|Bot)\s+/i, '');

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Invalid authorization header format' },
        { status: 401 }
      ),
    };
  }

  // Verify token with Discord
  const user = await verifyDiscordToken(token);

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Invalid Discord token' },
        { status: 401 }
      ),
    };
  }

  // Check if user is admin
  if (!isAdminUser(user.id)) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden: Admin access required',
          userId: user.id,
          hint: 'Add your Discord user ID to DISCORD_ADMIN_USER_IDS environment variable'
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Alternative: Simple Discord bot token verification
 * Use this if you just want to verify the request is from your bot
 */
export function verifyBotToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.DISCORD_BOT_TOKEN;

  if (!authHeader || !expectedToken) {
    return false;
  }

  const token = authHeader.replace(/^(Bearer|Bot)\s+/i, '');
  return token === expectedToken;
}

/**
 * Simple bot token middleware
 * Less secure than Discord OAuth but simpler for bot-only admin access
 */
export function requireBotToken(request: NextRequest): NextResponse | null {
  if (!verifyBotToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid bot token' },
      { status: 401 }
    );
  }
  return null;
}
