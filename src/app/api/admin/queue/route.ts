import { NextRequest, NextResponse } from 'next/server';
import { mintQueue } from '@/lib/mintQueue';
import { requireAdminSession } from '@/lib/auth/session';

/**
 * Admin Queue Management API
 * GET: Get current queue status
 * DELETE: Clear entire queue
 */

/**
 * GET /api/admin/queue
 * Returns current queue state with all entries
 */
export async function GET(request: NextRequest) {
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

    // Get current queue state
    const queueEntries = await mintQueue.getQueueState();
    const queueLength = await mintQueue.getQueueLength();

    return NextResponse.json({
      success: true,
      queueLength,
      entries: queueEntries,
      message: `Found ${queueLength} active entries in queue`
    });

  } catch (error: any) {
    console.error('Error getting queue state:', error);
    return NextResponse.json(
      { error: 'Failed to get queue state', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/queue
 * Clears the entire queue (removes all entries)
 */
export async function DELETE(request: NextRequest) {
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

    // Clear the queue by removing all entries
    const deleted = await mintQueue.clearQueue();

    console.log(`🧹 Admin cleared queue - removed ${deleted} entries`);

    return NextResponse.json({
      success: true,
      deleted,
      message: `Cleared ${deleted} entries from queue`
    });

  } catch (error: any) {
    console.error('Error clearing queue:', error);
    return NextResponse.json(
      { error: 'Failed to clear queue', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/queue
 * Manually trigger cleanup of stale entries
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

    // Run cleanup manually
    await mintQueue.cleanup();

    console.log('🧹 Admin triggered manual queue cleanup');

    // Get updated queue state
    const queueEntries = await mintQueue.getQueueState();
    const queueLength = await mintQueue.getQueueLength();

    return NextResponse.json({
      success: true,
      queueLength,
      entries: queueEntries,
      message: 'Cleanup completed successfully'
    });

  } catch (error: any) {
    console.error('Error running cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup', details: error.message },
      { status: 500 }
    );
  }
}
