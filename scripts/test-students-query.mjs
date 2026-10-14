import mysql from 'mysql2/promise';

async function testStudentsQuery() {
  const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2eAdwtaQKjkweGo.root',
    password: 'WlFXPmU3OQVc5m0p',
    database: 'xhubhack',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  const studentId = 30001; // vignesh
  const psId = 20;

  try {
    console.log('Testing myReg query...');
    const [myReg] = await pool.query(
      "SELECT id FROM registrations WHERE student_id = ? AND problem_statement_id = ? AND status = 'active'",
      [studentId, psId]
    );
    console.log('myReg result:', myReg);

    console.log('Testing students query...');
    const [students] = await pool.query(`
      SELECT s.id, s.full_name, s.vt_number, s.academic_year, s.skills,
             d.name as department_name, d.code as department_code,
             r.registered_at,
             CASE WHEN s.id = ? THEN 1 ELSE 0 END as is_me,
             (SELECT status FROM invitations i 
              WHERE i.sender_id = ? AND i.recipient_id = s.id 
              AND i.problem_statement_id = ? AND i.status = 'pending'
              LIMIT 1) as pending_invite_status,
             (SELECT tm.id FROM team_memberships tm 
              JOIN teams t ON tm.team_id = t.id 
              WHERE tm.student_id = s.id AND t.problem_statement_id = ?
              AND t.status != 'dissolved' LIMIT 1) as has_team
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE r.problem_statement_id = ? AND r.status = 'active'
      ORDER BY r.registered_at ASC
    `, [studentId, studentId, psId, psId, psId]);
    console.log('students result:', students);

    console.log('Testing quota query...');
    const [quota] = await pool.query(`
      SELECT pqu.pings_sent,
             ps.max_pings_per_student
      FROM problem_statements ps
      LEFT JOIN ping_quota_usage pqu ON pqu.student_id = ? AND pqu.problem_statement_id = ps.id
      WHERE ps.id = ?
    `, [studentId, psId]);
    console.log('quota result:', quota);
  } catch (err) {
    console.error('FAILED with error:', err);
  } finally {
    await pool.end();
  }
}

testStudentsQuery().catch(console.error);
