import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const prompt = `## Event: Minneapolis ICE Office Shooting (February 2025)

On February 19, 2025, a shooting occurred at an ICE (Immigration and Customs Enforcement) field office in Minneapolis, Minnesota. A man opened fire on federal agents, wounding several. The shooter was killed by return fire from agents.

This event occurred during a period of heightened tensions around immigration enforcement under the Trump administration's expanded deportation operations.

Analyze this event comprehensively. Cover:
- What happened (timeline, casualties, location details)
- Who was the shooter and what was his background/motivation
- The law enforcement and government response
- How this event relates to the broader political context around immigration
- Any controversies or disputed narratives around the event
- What remains unknown or unconfirmed

Be precise. Distinguish between confirmed facts and speculation. If sources conflict, note the disagreement.`;

await sql`UPDATE events SET prompt_template = ${prompt}, updated_at = now() WHERE id = '31b2a8fe-9935-4afb-bc38-3685a55cbf1c'`;
console.log('Prompt updated!');
