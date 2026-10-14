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
  console.log('All Registrations in DB:', regs);

  const [students] = await pool.query('SELECT id, full_name, email, vt_number FROM students');
  console.log('All Students in DB:', students);

  await pool.end();
}

main().catch(console.error);
