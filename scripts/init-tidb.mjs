import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const dbConfig = {
  host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: Number(process.env.TIDB_PORT) || 4000,
  user: process.env.TIDB_USER || '2eAdwtaQKjkweGo.root',
  password: process.env.TIDB_PASSWORD || 'WlFXPmU3OQVc5m0p',
  database: process.env.TIDB_DATABASE || 'xhubhack',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
};

async function init() {
  console.log('Connecting to TiDB Cloud cluster...');
  const pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();

  try {
    console.log('Connected! Creating tables...');

    // Departments
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50),
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Companies
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Problem Statements
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS problem_statements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ps_id VARCHAR(100) NOT NULL UNIQUE,
        sno INT,
        title VARCHAR(500),
        background TEXT,
        description LONGTEXT,
        expected_outcome LONGTEXT,
        remarks TEXT,
        company_id INT,
        department_raw VARCHAR(255),
        max_registrations INT NOT NULL DEFAULT 0,
        max_pings_per_student INT NOT NULL DEFAULT 0,
        max_team_members INT NOT NULL DEFAULT 0,
        registration_open TINYINT(1) NOT NULL DEFAULT 0,
        needs_config_review TINYINT(1) NOT NULL DEFAULT 1,
        import_batch_id INT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company (company_id),
        INDEX idx_ps_id (ps_id)
      );
    `);

    // Department eligibility
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS problem_dept_eligibility (
        id INT AUTO_INCREMENT PRIMARY KEY,
        problem_statement_id INT NOT NULL,
        department_id INT NOT NULL,
        UNIQUE KEY uq_ps_dept (problem_statement_id, department_id),
        INDEX idx_dept (department_id)
      );
    `);

    // Admins
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Students
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        vt_number VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        department_id INT,
        academic_year VARCHAR(50),
        skills TEXT,
        password_hash VARCHAR(255) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dept (department_id),
        INDEX idx_vt (vt_number)
      );
    `);

    // Faculty
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS faculty (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        department_id INT,
        designation VARCHAR(255),
        expertise TEXT,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Mentor Assignments
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mentor_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        problem_statement_id INT NOT NULL,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_fac_ps (faculty_id, problem_statement_id)
      );
    `);

    // Registrations
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        problem_statement_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_stu_ps (student_id, problem_statement_id),
        INDEX idx_ps (problem_statement_id)
      );
    `);

    // Ping Quota Usage
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ping_quota_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        problem_statement_id INT NOT NULL,
        pings_sent INT NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_stu_ping_ps (student_id, problem_statement_id)
      );
    `);

    // Teams
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        problem_statement_id INT NOT NULL,
        name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'forming',
        created_by_student_id INT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ps (problem_statement_id)
      );
    `);

    // Team Memberships
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS team_memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        student_id INT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_team_stu (team_id, student_id),
        INDEX idx_student (student_id)
      );
    `);

    // Invitations
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        problem_statement_id INT NOT NULL,
        team_id INT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        message TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_id),
        INDEX idx_recipient (recipient_id),
        INDEX idx_ps (problem_statement_id)
      );
    `);

    // Notifications
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        admin_id INT,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        data TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student (student_id)
      );
    `);

    // Import Batches
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS import_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        total_rows INT,
        imported_rows INT,
        skipped_rows INT,
        error_rows INT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        imported_by_admin_id INT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );
    `);

    // Import Errors
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS import_errors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        \`row_number\` INT,
        ps_id VARCHAR(100),
        error_type VARCHAR(100) NOT NULL,
        error_message TEXT NOT NULL,
        raw_data TEXT,
        INDEX idx_batch (batch_id)
      );
    `);

    // Audit Logs
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_type VARCHAR(50) NOT NULL,
        actor_id INT,
        actor_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INT,
        old_data TEXT,
        new_data TEXT,
        ip_address VARCHAR(100),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables verified and created successfully in TiDB!');

    // Seed departments
    const departments = [
      { name: 'School of Computing', code: 'SoC' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Electronics and Communication Engineering', code: 'ECE' },
      { name: 'Master of Business Administration', code: 'MBA' },
      { name: 'Mechatronics Engineering', code: 'MECT' },
      { name: 'Artificial Intelligence and Data Science', code: 'AI&DS' },
      { name: 'Civil Engineering', code: 'CIVIL' },
      { name: 'Electrical and Electronics Engineering', code: 'EEE' },
    ];

    for (const d of departments) {
      await conn.execute(
        `INSERT IGNORE INTO departments (name, code) VALUES (?, ?)`,
        [d.name, d.code]
      );
    }
    console.log('Departments seeded.');

    // Seed default admin
    const adminPassword = 'Admin@XHub2026';
    const adminHash = bcrypt.hashSync(adminPassword, 12);
    await conn.execute(
      `INSERT INTO admins (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      ['Administrator', 'admin@veltech.edu.in', adminHash, 'superadmin']
    );
    console.log('Default admin seeded: admin@veltech.edu.in / Admin@XHub2026');

    // Excel import
    const excelPath = path.join(ROOT, 'Hackathon 2026 (1).xlsx');
    if (fs.existsSync(excelPath)) {
      console.log(`Reading Excel file from ${excelPath}...`);
      const buffer = fs.readFileSync(excelPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames.includes('RAW DATA') ? 'RAW DATA' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      const [batchRes] = await conn.execute(
        `INSERT INTO import_batches (filename, total_rows, status, imported_by_admin_id) VALUES (?, ?, 'processing', 1)`,
        [path.basename(excelPath), rows.length - 1]
      );
      const batchId = batchRes.insertId;

      const DEPT_MAP = {
        'school of computing': 'School of Computing',
        'soc': 'School of Computing',
        'mech': 'Mechanical Engineering',
        'mechanical': 'Mechanical Engineering',
        'ece': 'Electronics and Communication Engineering',
        'mba': 'Master of Business Administration',
        'mechatronics': 'Mechatronics Engineering',
        'ai & ds': 'Artificial Intelligence and Data Science',
        'ai&ds': 'Artificial Intelligence and Data Science',
      };

      function normalizeDept(raw) {
        if (!raw) return [];
        const parts = String(raw).split(/[/,]/).map(s => s.trim().toLowerCase());
        const result = [];
        for (const part of parts) {
          const found = Object.entries(DEPT_MAP).find(([k]) => part.includes(k));
          if (found && !result.includes(found[1])) result.push(found[1]);
        }
        return result;
      }

      let currentCompany = null;
      let imported = 0;
      let updated = 0;
      let errors = 0;

      // Cache departments
      const [deptRows] = await conn.execute('SELECT id, name FROM departments');
      const deptCache = {};
      for (const d of deptRows) {
        deptCache[d.name.toLowerCase()] = d.id;
      }
      const compCache = {};

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;

        const sno = Number(row[0]);
        if (isNaN(sno)) continue;

        if (row[2] && String(row[2]).trim()) currentCompany = String(row[2]).trim();

        const psId = row[1] ? String(row[1]).trim() : `PS - ${String(sno).padStart(2, '0')}`;
        const dept = row[3] ? String(row[3]).replace(/\n/g, '/').trim() : null;
        const title = row[4] ? String(row[4]).replace(/\n/g, ' ').trim() : null;
        const background = row[5] ? String(row[5]).trim() : null;
        const description = row[6] ? String(row[6]).trim() : null;
        const expectedOutcome = row[7] ? String(row[7]).trim() : null;
        const remarks = row[8] ? String(row[8]).trim() : null;

        try {
          let companyId = null;
          if (currentCompany) {
            const key = currentCompany.toLowerCase();
            if (compCache[key]) {
              companyId = compCache[key];
            } else {
              await conn.execute('INSERT IGNORE INTO companies (name) VALUES (?)', [currentCompany]);
              const [cRows] = await conn.execute('SELECT id FROM companies WHERE name = ?', [currentCompany]);
              companyId = cRows[0].id;
              compCache[key] = companyId;
            }
          }

          const [existing] = await conn.execute('SELECT id FROM problem_statements WHERE ps_id = ?', [psId]);

          let targetPsDbId;
          if (existing.length > 0) {
            targetPsDbId = existing[0].id;
            await conn.execute(
              `UPDATE problem_statements 
               SET sno=?, title=?, background=?, description=?, expected_outcome=?, remarks=?, company_id=?, department_raw=?, import_batch_id=?
               WHERE id=?`,
              [sno, title, background, description, expectedOutcome, remarks, companyId, dept, batchId, targetPsDbId]
            );
            await conn.execute('DELETE FROM problem_dept_eligibility WHERE problem_statement_id = ?', [targetPsDbId]);
            updated++;
          } else {
            const [insertRes] = await conn.execute(
              `INSERT INTO problem_statements (ps_id, sno, title, background, description, expected_outcome, remarks, company_id, department_raw, import_batch_id, needs_config_review, registration_open)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
              [psId, sno, title, background, description, expectedOutcome, remarks, companyId, dept, batchId]
            );
            targetPsDbId = insertRes.insertId;
            imported++;
          }

          if (dept) {
            const deptNames = normalizeDept(dept);
            for (const dn of deptNames) {
              const dk = dn.toLowerCase();
              let did = deptCache[dk];
              if (!did) {
                await conn.execute('INSERT IGNORE INTO departments (name) VALUES (?)', [dn]);
                const [dRows] = await conn.execute('SELECT id FROM departments WHERE name = ?', [dn]);
                did = dRows[0].id;
                deptCache[dk] = did;
              }
              await conn.execute('INSERT IGNORE INTO problem_dept_eligibility (problem_statement_id, department_id) VALUES (?, ?)', [targetPsDbId, did]);
            }
          }
        } catch (err) {
          console.error(`Error row ${i} (PS: ${psId}):`, err.message);
          errors++;
        }
      }

      await conn.execute(
        `UPDATE import_batches SET imported_rows=?, skipped_rows=?, error_rows=?, status='completed', completed_at=NOW() WHERE id=?`,
        [imported, updated, errors, batchId]
      );
      console.log(`✅ Excel import finished: ${imported} imported, ${updated} updated, ${errors} errors`);
    } else {
      console.log('No Excel file found at ' + excelPath);
    }

    const [psCount] = await conn.execute('SELECT COUNT(*) as cnt FROM problem_statements');
    console.log(`Total problem statements in TiDB: ${psCount[0].cnt}`);

  } finally {
    conn.release();
    await pool.end();
  }
}

init().catch(console.error);
