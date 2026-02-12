import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, title, substring(prompt_template from 1 for 200) as prompt_preview FROM events`;
console.log(JSON.stringify(rows, null, 2));
