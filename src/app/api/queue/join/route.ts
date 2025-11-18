import { NextRequest, NextResponse } from 'next/server';
import { mintQueue } from '@/lib/mintQueue';

/**
 * Join the mint queue
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing walletAddress' },
        { status: 400 }
      );
    }

    const { queueId, position } = await mintQueue.addToQueue(walletAddress);

    return NextResponse.json({
      success: true,
      queueId,
      position,
      message: position === 1
        ? 'You are first in queue! You can mint now.'
        : `You are #${position} in queue. Please wait...`
    });
  } catch (error: any) {
    console.error('Error joining queue:', error);
    return NextResponse.json(
      { error: 'Failed to join queue', details: error.message },
      { status: 500 }
    );
  }
}
