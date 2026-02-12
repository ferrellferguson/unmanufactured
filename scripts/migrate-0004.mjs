import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "message" text NOT NULL,
  "name" varchar(255),
  "email" varchar(255),
  "created_at" timestamp NOT NULL DEFAULT now()
)`;
console.log('Created feedback table');

console.log('Migration 0004 complete!');
