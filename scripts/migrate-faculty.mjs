import mysql from 'mysql2/promise';

async function migrateFaculty() {
  const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2eAdwtaQKjkweGo.root',
    password: 'WlFXPmU3OQVc5m0p',
    database: 'xhubhack',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  try {
    console.log('Adding password_hash column to faculty table if missing...');
    await pool.query(`
      ALTER TABLE faculty 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER expertise
    `);
    console.log('faculty table updated successfully!');

    // Check if mentor_assignments has unique index or proper constraints
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentor_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        problem_statement_id INT NOT NULL,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_fac_ps (faculty_id, problem_statement_id),
        INDEX idx_fac (faculty_id),
        INDEX idx_ps (problem_statement_id)
      )
    `);
    console.log('mentor_assignments table verified!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrateFaculty().catch(console.error);
