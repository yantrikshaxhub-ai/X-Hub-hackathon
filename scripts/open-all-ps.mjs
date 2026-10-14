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

  console.log('Opening all problem statements and allocating slots...');
  const [result] = await pool.execute(`
    UPDATE problem_statements
    SET 
      registration_open = 1,
      max_registrations = CASE WHEN max_registrations = 0 THEN 30 ELSE max_registrations END,
      max_pings_per_student = CASE WHEN max_pings_per_student = 0 THEN 5 ELSE max_pings_per_student END,
      max_team_members = CASE WHEN max_team_members = 0 THEN 4 ELSE max_team_members END,
      needs_config_review = 0,
      updated_at = NOW()
  `);

  console.log('Update result:', result);

  const [counts] = await pool.query(`
    SELECT registration_open, COUNT(*) as count, AVG(max_registrations) as avg_slots 
    FROM problem_statements 
    GROUP BY registration_open
  `);
  console.log('Updated Status Counts:', counts);

  await pool.end();
}

main().catch(console.error);
