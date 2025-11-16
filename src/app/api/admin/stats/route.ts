import { NextRequest, NextResponse } from 'next/server';
import { getAllSales, getAvailableNFTIds, getCurrentNetwork } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  // Require authenticated admin session
  const user = await requireAdminSession();

  if (!user) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Please login with Discord',
        loginUrl: '/api/auth/discord/login'
      },
      { status: 401 }
    );
  }

  try {
    const sales = await getAllSales();
    const available = await getAvailableNFTIds();
    const network = getCurrentNetwork();

    return NextResponse.json({
      authenticatedUser: {
        id: user.id,
        username: user.username,
      },
      network: network.toUpperCase(),
      totalSupply: 2000,
      sold: sales.length,
      available: available.length,
      recentSales: sales.slice(0, 10).map(sale => ({
        nftId: sale.nftId,
        walletAddress: sale.walletAddress,
        txHash: sale.txHash,
        soldAt: new Date(sale.soldAt).toLocaleString()
      }))
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
