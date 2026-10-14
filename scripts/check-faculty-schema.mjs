import mysql from 'mysql2/promise';

async function checkFacultyTable() {
  const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2eAdwtaQKjkweGo.root',
    password: 'WlFXPmU3OQVc5m0p',
    database: 'xhubhack',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  const [cols] = await pool.query('DESCRIBE faculty');
  console.log('Faculty Table Columns:', cols);

  const [mentorCols] = await pool.query('DESCRIBE mentor_assignments');
  console.log('Mentor Assignments Table Columns:', mentorCols);

  const [facultyRows] = await pool.query('SELECT * FROM faculty');
  console.log('Existing Faculty Rows:', facultyRows);

  await pool.end();
}

checkFacultyTable().catch(console.error);
