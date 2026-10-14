import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2eAdwtaQKjkweGo.root',
    password: 'WlFXPmU3OQVc5m0p',
    database: 'xhubhack',
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  });

  const [rows] = await pool.query('SELECT registration_open, COUNT(*) as count FROM problem_statements GROUP BY registration_open');
  console.log('Registration open counts:', rows);

  const [regCounts] = await pool.query('SELECT max_registrations, COUNT(*) as count FROM problem_statements GROUP BY max_registrations');
  console.log('Max registrations counts:', regCounts);

  const [sample] = await pool.query('SELECT id, ps_id, title, registration_open, max_registrations FROM problem_statements LIMIT 10');
  console.log('Sample problem statements:', sample);

  await pool.end();
}

main().catch(console.error);
