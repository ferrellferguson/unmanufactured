import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const sr = await sql`SELECT id, title, score, published_date FROM search_results WHERE poll_cycle_id = '48ac359a-5d21-4721-87cc-bbf0d6ec9d1a' ORDER BY score DESC`;
console.log(`\n=== Search Results (${sr.length}) ===`);
sr.forEach(r => console.log(`  [${(r.score * 100).toFixed(0)}%] ${r.title} ${r.published_date || ''}`));

const cr = await sql`SELECT snapshot_id, provided_fact, rejected, similarity_score FROM context_rejections WHERE event_id = 'a749773d-0393-450e-9e2d-20b1384a61bb' ORDER BY snapshot_id, rejected DESC`;
console.log(`\n=== Context Rejections (${cr.length}) ===`);
const rejected = cr.filter(r => r.rejected);
const accepted = cr.filter(r => !r.rejected);
console.log(`  Rejected: ${rejected.length}, Accepted: ${accepted.length}`);
rejected.forEach(r => console.log(`  [REJECTED ${(r.similarity_score * 100).toFixed(1)}%] ${r.provided_fact.substring(0, 80)}...`));
