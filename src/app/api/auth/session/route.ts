import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Type for session data
interface SessionData {
  walletId: string;
  address: string;
  connectedAt: number;
}

// Session cookie name
const SESSION_COOKIE_NAME = "wallet-session";

// GET /api/auth/session - Get current session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session found" }, { status: 404 });
    }

    // Parse session data
    const session: SessionData = JSON.parse(sessionCookie.value);

    // Check if session is still valid (optional: add expiration logic)
    const sessionAge = Date.now() - session.connectedAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      // Session expired, remove it
      cookieStore.delete(SESSION_COOKIE_NAME);
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

// POST /api/auth/session - Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletId, address } = body;

    // Validate input
    if (!walletId || !address) {
      return NextResponse.json(
        { error: "Missing walletId or address" },
        { status: 400 }
      );
    }

    // Create session data
    const sessionData: SessionData = {
      walletId,
      address,
      connectedAt: Date.now(),
    };

    // Set cookie with session data
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: JSON.stringify(sessionData),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: "/",
    });

    return NextResponse.json({
      success: true,
      session: sessionData,
    });
  } catch (error) {
    console.error("Session POST error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/session - Delete session
export async function DELETE() {
  try {
    const cookieStore = await cookies();

    // Check if session exists
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No session to delete" },
        { status: 404 }
      );
    }

    // Delete the session cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
