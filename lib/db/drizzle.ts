import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const isSupabase = process.env.POSTGRES_URL?.includes('supabase');
const isServerless = process.env.VERCEL === '1';
export const client = postgres(process.env.POSTGRES_URL, {
  ssl: isSupabase ? 'require' : false,
  max: isServerless ? 1 : 10, // 1 para serverless, 10 para VPS
});
export const db = drizzle(client, { schema });
