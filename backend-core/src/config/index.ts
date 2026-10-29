import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/pm_ai_db?schema=public';
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pm_ai_db?schema=public',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  groqFallbackModel: process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
};
