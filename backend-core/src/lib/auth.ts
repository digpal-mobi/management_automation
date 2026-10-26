import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';
import { config } from '../config/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string | null;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtAccessSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers['authorization'];
  let token = '';

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Also fallback to cookie if authorization header not sent
  if (!token && (req as any).cookies?.access_token) {
    token = (req as any).cookies.access_token;
  }

  let payload = token ? verifyAccessToken(token) : null;
  if (!payload && (req as any).cookies?.refresh_token) {
    const refreshToken = (req as any).cookies.refresh_token as string;
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (refreshPayload) {
      const activeToken = await prisma.refreshToken.findFirst({
        where: {
          tokenHash: hashToken(refreshToken),
          userId: refreshPayload.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (activeToken) payload = refreshPayload;
    }
  }

  if (!payload) {
    return null;
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

  return user;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
  }
  req.user = user;
  next();
}
