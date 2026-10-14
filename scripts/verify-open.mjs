import { getDb } from './lib/db.js';

async function testApi() {
  const db = getDb();
  const problems = await db.prepare(`
    SELECT ps.id, ps.ps_id, ps.title, ps.registration_open, ps.max_registrations, c.name as company_name
    FROM problem_statements ps
    LEFT JOIN companies c ON ps.company_id = c.id
    WHERE ps.registration_open = 1
  `).all();
  console.log(`Total Open Problem Statements in DB: ${problems.length}`);
  console.log('Sample Open PS:', problems.slice(0, 5));
}

testApi().catch(console.error);
