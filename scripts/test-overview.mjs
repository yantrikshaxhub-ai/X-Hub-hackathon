import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2eAdwtaQKjkweGo.root',
    password: 'WlFXPmU3OQVc5m0p',
    database: 'xhubhack',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  const [regs] = await pool.query('SELECT * FROM registrations');
  console.log('Registrations in DB:', regs);

  const [students] = await pool.query('SELECT id, full_name, email, vt_number, department_id FROM students');
  console.log('Students in DB:', students);

  const [joinRes] = await pool.query(`
    SELECT 
      r.id as registration_id,
      r.status as registration_status,
      r.created_at as registered_at,
      s.id as student_id,
      s.full_name as student_name,
      s.vt_number,
      s.email as student_email,
      d.name as department_name,
      ps.ps_id,
      ps.title as problem_title,
      c.name as company_name
    FROM registrations r
    LEFT JOIN students s ON r.student_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN problem_statements ps ON r.problem_statement_id = ps.id
    LEFT JOIN companies c ON ps.company_id = c.id
  `);
  console.log('Joined query results:', joinRes);

  await pool.end();
}

main().catch(console.error);
