import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const isSupabase = process.env.POSTGRES_URL?.includes('supabase');
export const client = postgres(process.env.POSTGRES_URL, {
  ssl: isSupabase ? 'require' : false,
  max: 1, // Necessário para ambientes serverless (Vercel)
});
export const db = drizzle(client, { schema });
