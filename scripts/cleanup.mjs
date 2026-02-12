import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

// Delete old data in correct order (foreign keys)
await sql`DELETE FROM memory_holes WHERE event_id = '31b2a8fe-9935-4afb-bc38-3685a55cbf1c'`;
await sql`DELETE FROM drift_scores WHERE event_id = '31b2a8fe-9935-4afb-bc38-3685a55cbf1c'`;
await sql`DELETE FROM fact_nodes WHERE event_id = '31b2a8fe-9935-4afb-bc38-3685a55cbf1c'`;
await sql`DELETE FROM snapshots WHERE event_id = '31b2a8fe-9935-4afb-bc38-3685a55cbf1c'`;
await sql`DELETE FROM poll_cycles WHERE event_id = '31b2a8fe-9935-4afb-bc38-3685a55cbf1c'`;

console.log('Old snapshots cleared! Ready for a fresh poll.');
