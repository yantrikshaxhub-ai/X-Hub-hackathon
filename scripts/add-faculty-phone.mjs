import mysql from 'mysql2/promise';

async function addFacultyPhone() {
  const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2eAdwtaQKjkweGo.root',
    password: 'WlFXPmU3OQVc5m0p',
    database: 'xhubhack',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  try {
    console.log('Adding phone column to faculty table...');
    await pool.query(`
      ALTER TABLE faculty 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL AFTER email
    `);
    console.log('Successfully added phone column to faculty table in TiDB!');

    const [cols] = await pool.query('DESCRIBE faculty');
    console.log('Faculty Table Columns:', cols);
  } catch (err) {
    console.error('Error adding phone column:', err);
  } finally {
    await pool.end();
  }
}

addFacultyPhone().catch(console.error);
