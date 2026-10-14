import { getDb } from './lib/db.js';

async function testOverview() {
  const db = getDb();
  const detailedRegistrations = await db.prepare(`
    SELECT 
      r.id as registration_id,
      r.status as registration_status,
      r.registered_at,
      s.id as student_id,
      s.full_name as student_name,
      s.vt_number,
      s.email as student_email,
      s.academic_year,
      s.skills,
      d.id as department_id,
      COALESCE(d.name, 'School of Computing') as department_name,
      COALESCE(d.code, 'SoC') as department_code,
      ps.id as problem_statement_id,
      ps.ps_id,
      ps.title as problem_title,
      c.id as company_id,
      COALESCE(c.name, 'Industry Partner') as company_name
    FROM registrations r
    JOIN students s ON r.student_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN problem_statements ps ON r.problem_statement_id = ps.id
    LEFT JOIN companies c ON ps.company_id = c.id
    WHERE r.status = 'active'
    ORDER BY r.registered_at DESC
  `).all();

  console.log('Detailed Registrations fetched successfully:', detailedRegistrations);
}

testOverview().catch(console.error);
