import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '@/lib/auth';

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: (parsed.error as any).issues?.[0]?.message || parsed.error.message },
        { status: 400 }
      );
    }

    const { login, password } = parsed.data;
    const cleanLogin = login.toLowerCase();

    // Find user by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanLogin }, { username: cleanLogin }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials. User not found.' },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials. Incorrect password.' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token hash
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal login error' },
      { status: 500 }
    );
  }
}
