import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../lib/auth.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { email, username, password } = parsed.data;

      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists',
        });
      }

      const existingUsername = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
      });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          error: 'This username is already taken',
        });
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          passwordHash,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt,
        },
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });

      return res.status(201).json({
        success: true,
        accessToken,
        user,
      });
    } catch (error: any) {
      console.error('[AuthController.register] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Registration failed',
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: (parsed.error as any).issues?.[0]?.message || parsed.error.message,
        });
      }

      const { login, password } = parsed.data;
      const cleanLogin = login.toLowerCase();

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: cleanLogin }, { username: cleanLogin }],
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. User not found.',
        });
      }

      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. Incorrect password.',
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt,
        },
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });

      return res.status(200).json({
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
    } catch (error: any) {
      console.error('[AuthController.login] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal login error',
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'No refresh token provided',
        });
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
      }

      const tokenHash = hashToken(refreshToken);

      const dbToken = await prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          userId: payload.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!dbToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token has been revoked or expired',
        });
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
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const newAccessToken = generateAccessToken(tokenPayload);

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        user,
      });
    } catch (error: any) {
      console.error('[AuthController.refresh] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Token refresh failed',
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: {
            tokenHash,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      res.clearCookie('refresh_token', cookieOptions);
      res.clearCookie('access_token', cookieOptions);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      console.error('[AuthController.logout] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Logout error',
      });
    }
  }
}
