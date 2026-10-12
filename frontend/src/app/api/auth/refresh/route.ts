import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const tokenHash = hashToken(refreshToken);

    // Verify token exists in DB and is active
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!dbToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token has been revoked or expired' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      user,
    });
  } catch (error: any) {
    console.error('[Refresh Token API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Token refresh failed' },
      { status: 500 }
    );
  }
}
