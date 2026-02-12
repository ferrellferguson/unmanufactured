import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "last_polled_at" timestamp`;
console.log('Added last_polled_at column to events');

console.log('Migration 0003 complete!');
