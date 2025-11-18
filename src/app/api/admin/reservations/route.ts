import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredReservations } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth/session';

/**
 * Admin Reservation Cleanup API
 * POST: Cleanup expired reservations (abandoned mints)
 */

/**
 * POST /api/admin/reservations
 * Manually trigger cleanup of expired reservations
 */
export async function POST(request: NextRequest) {
  try {
    // Require authenticated admin session
    const user = await requireAdminSession();

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized - Admin access required',
          message: 'Please login with Discord',
          loginUrl: '/api/auth/discord/login'
        },
        { status: 401 }
      );
    }

    // Run cleanup
    const cleanedCount = await cleanupExpiredReservations();

    console.log(`🧹 Admin triggered reservation cleanup - removed ${cleanedCount} entries`);

    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      message: cleanedCount > 0
        ? `Cleaned up ${cleanedCount} expired reservation(s)`
        : 'No expired reservations to clean up'
    });

  } catch (error: any) {
    console.error('Error cleaning up reservations:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup reservations', details: error.message },
      { status: 500 }
    );
  }
}
