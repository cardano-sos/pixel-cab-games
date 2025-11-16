/**
 * Session management for Discord OAuth authentication
 * Uses JWT tokens stored in HTTP-only cookies
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'discord_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface SessionUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

/**
 * Get JWT secret key
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'your-secure-secret-key-here';
  return new TextEncoder().encode(secret);
}

/**
 * Create a session token for a user
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    user: {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      email: user.email,
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + SESSION_DURATION))
    .sign(getSecretKey());

  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const verified = await jwtVerify(token, getSecretKey());
    const payload = verified.payload as any;
    return payload.user;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  return verifySession(sessionCookie.value);
}

/**
 * Set session cookie in response
 */
export async function setSessionCookie(response: NextResponse, token: string): Promise<void> {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSession(response: NextResponse): Promise<void> {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Check if a user is an admin
 */
export function isAdminUser(userId: string): boolean {
  const adminUserIds = process.env.DISCORD_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  return adminUserIds.includes(userId);
}

/**
 * Require authentication and admin privileges
 * Returns user if authenticated and admin, null otherwise
 */
export async function requireAdminSession(): Promise<SessionUser | null> {
  const user = await getSession();

  if (!user) {
    return null;
  }

  if (!isAdminUser(user.id)) {
    return null;
  }

  return user;
}
