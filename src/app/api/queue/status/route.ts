import { NextRequest, NextResponse } from 'next/server';
import { mintQueue } from '@/lib/mintQueue';

/**
 * Get queue status for a specific queue ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queueId');

    if (!queueId) {
      return NextResponse.json(
        { error: 'Missing queueId parameter' },
        { status: 400 }
      );
    }

    const status = await mintQueue.getQueueStatus(queueId);

    if (!status) {
      return NextResponse.json(
        { error: 'Queue entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status', details: error.message },
      { status: 500 }
    );
  }
}
