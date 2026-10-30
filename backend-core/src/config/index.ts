import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL_POOLED or DATABASE_URL is not defined');
}
process.env.DATABASE_URL = dbUrl;

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: dbUrl,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  groqFallbackModel: process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
};
