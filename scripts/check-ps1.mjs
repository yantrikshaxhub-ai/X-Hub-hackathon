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

  const [ps1] = await pool.query('SELECT * FROM problem_statements WHERE id = 1');
  console.log('PS 1 row:', ps1);

  await pool.end();
}

main().catch(console.error);
