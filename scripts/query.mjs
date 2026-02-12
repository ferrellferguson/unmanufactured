import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, title, slug FROM events`;
console.log(JSON.stringify(rows, null, 2));
