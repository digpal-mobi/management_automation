import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pm_ai_db?schema=public',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
