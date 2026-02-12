import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const events = await sql`SELECT id, title, prompt_template FROM events`;

for (const event of events) {
  // Skip Minneapolis - already has a good prompt
  if (event.prompt_template.includes('Minneapolis ICE')) continue;

  const newPrompt = `## Event: ${event.title}

Analyze this event comprehensively: "${event.title}"

Cover:
1. **Key Facts**: What happened, who was involved, when, where
2. **Context**: Background information and relevant history
3. **Current Status**: Latest developments
4. **Uncertainties**: What remains unknown or contested
5. **Analysis**: What this means and potential implications

Be precise. Distinguish between confirmed facts and speculation. If sources conflict, note the disagreement.`;

  await sql`UPDATE events SET prompt_template = ${newPrompt}, updated_at = now() WHERE id = ${event.id}`;
  console.log(`Updated: ${event.title}`);
}

console.log('All prompts updated!');
