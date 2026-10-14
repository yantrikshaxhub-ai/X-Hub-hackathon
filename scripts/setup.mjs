#!/usr/bin/env node
/**
 * Setup script: Creates the default admin and imports Excel data
 * Run: node scripts/setup.mjs
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DB_DIR, 'xhub.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Running database migrations...');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS problem_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ps_id TEXT NOT NULL UNIQUE,
    sno INTEGER,
    title TEXT,
    background TEXT,
    description TEXT,
    expected_outcome TEXT,
    remarks TEXT,
    company_id INTEGER REFERENCES companies(id),
    department_raw TEXT,
    max_registrations INTEGER NOT NULL DEFAULT 0,
    max_pings_per_student INTEGER NOT NULL DEFAULT 0,
    max_team_members INTEGER NOT NULL DEFAULT 0,
    registration_open INTEGER NOT NULL DEFAULT 0,
    needs_config_review INTEGER NOT NULL DEFAULT 1,
    import_batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS problem_dept_eligibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_statement_id INTEGER NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(problem_statement_id, department_id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    vt_number TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id),
    academic_year TEXT,
    skills TEXT,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id),
    designation TEXT,
    expertise TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mentor_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
    problem_statement_id INTEGER NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(faculty_id, problem_statement_id)
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    problem_statement_id INTEGER NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'withdrawn')),
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, problem_statement_id)
  );

  CREATE TABLE IF NOT EXISTS ping_quota_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    problem_statement_id INTEGER NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    pings_sent INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, problem_statement_id)
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_statement_id INTEGER NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'forming' CHECK(status IN ('forming', 'confirmed', 'dissolved')),
    created_by_student_id INTEGER REFERENCES students(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS team_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('leader', 'member')),
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(team_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    problem_statement_id INTEGER NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS import_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    total_rows INTEGER,
    imported_rows INTEGER,
    skipped_rows INTEGER,
    error_rows INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    imported_by_admin_id INTEGER REFERENCES admins(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS import_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER,
    ps_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    raw_data TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL,
    actor_id INTEGER,
    actor_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    old_data TEXT,
    new_data TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

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

for (const dept of departments) {
  db.prepare('INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)').run(dept.name, dept.code);
}

console.log('Departments seeded.');

// Create default admin
const adminPassword = 'Admin@XHub2026';
const adminHash = bcrypt.hashSync(adminPassword, 12);
db.prepare('INSERT OR REPLACE INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
  'Administrator', 'admin@veltech.edu.in', adminHash, 'superadmin'
);
console.log('Default admin created: admin@veltech.edu.in / Admin@XHub2026');

// Import Excel data
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
  const parts = raw.split(/[/,]/).map(s => s.trim().toLowerCase());
  const result = [];
  for (const part of parts) {
    const found = Object.entries(DEPT_MAP).find(([k]) => part.includes(k));
    if (found && !result.includes(found[1])) result.push(found[1]);
  }
  return result;
}

// Look for Excel file
const possiblePaths = [
  path.join(ROOT, 'Hackathon 2026  (1).xlsx'),
  path.join(path.dirname(ROOT), 'Hackathon2026.xlsx'),
  path.join(ROOT, 'hackathon_data.xlsx'),
];

let excelPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) { excelPath = p; break; }
}

if (excelPath) {
  console.log(`\nImporting from: ${excelPath}`);
  
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets['RAW DATA'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const batchResult = db.prepare(`INSERT INTO import_batches (filename, total_rows, status, imported_by_admin_id) VALUES (?, ?, 'processing', 1)`)
    .run(path.basename(excelPath), rows.length - 1);
  const batchId = batchResult.lastInsertRowid;

  let currentCompany = null;
  let imported = 0, updated = 0, errors = 0;

  const importFn = db.transaction(() => {
    const deptCache = {};
    for (const d of db.prepare('SELECT id, name FROM departments').all()) {
      deptCache[d.name.toLowerCase()] = d.id;
    }
    const compCache = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) break;

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
        // Company
        let companyId = null;
        if (currentCompany) {
          const key = currentCompany.toLowerCase();
          if (compCache[key]) {
            companyId = compCache[key];
          } else {
            db.prepare('INSERT OR IGNORE INTO companies (name) VALUES (?)').run(currentCompany);
            companyId = db.prepare('SELECT id FROM companies WHERE name = ?').get(currentCompany).id;
            compCache[key] = companyId;
          }
        }

        const existing = db.prepare('SELECT id FROM problem_statements WHERE ps_id = ?').get(psId);

        if (existing) {
          db.prepare(`UPDATE problem_statements SET sno=?,title=?,background=?,description=?,expected_outcome=?,remarks=?,company_id=?,department_raw=?,import_batch_id=?,updated_at=datetime('now') WHERE ps_id=?`)
            .run(sno, title, background, description, expectedOutcome, remarks, companyId, dept, batchId, psId);

          db.prepare('DELETE FROM problem_dept_eligibility WHERE problem_statement_id = ?').run(existing.id);
          if (dept) {
            const deptNames = normalizeDept(dept);
            for (const dn of deptNames) {
              const dk = dn.toLowerCase();
              let did = deptCache[dk];
              if (!did) {
                db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)').run(dn);
                did = db.prepare('SELECT id FROM departments WHERE name = ?').get(dn).id;
                deptCache[dk] = did;
              }
              db.prepare('INSERT OR IGNORE INTO problem_dept_eligibility (problem_statement_id, department_id) VALUES (?,?)').run(existing.id, did);
            }
          }
          updated++;
        } else {
          const r = db.prepare(`INSERT INTO problem_statements (ps_id,sno,title,background,description,expected_outcome,remarks,company_id,department_raw,import_batch_id,needs_config_review) VALUES (?,?,?,?,?,?,?,?,?,?,1)`)
            .run(psId, sno, title, background, description, expectedOutcome, remarks, companyId, dept, batchId);
          const newId = r.lastInsertRowid;

          if (dept) {
            const deptNames = normalizeDept(dept);
            for (const dn of deptNames) {
              const dk = dn.toLowerCase();
              let did = deptCache[dk];
              if (!did) {
                db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)').run(dn);
                did = db.prepare('SELECT id FROM departments WHERE name = ?').get(dn).id;
                deptCache[dk] = did;
              }
              db.prepare('INSERT OR IGNORE INTO problem_dept_eligibility (problem_statement_id, department_id) VALUES (?,?)').run(newId, did);
            }
          }
          imported++;
        }
      } catch (e) {
        console.error(`Error importing PS ${psId}:`, e.message);
        errors++;
      }
    }

    db.prepare(`UPDATE import_batches SET imported_rows=?,skipped_rows=?,error_rows=?,status='completed',completed_at=datetime('now') WHERE id=?`)
      .run(imported, updated, errors, batchId);
  });

  importFn();
  console.log(`Import complete: ${imported} new, ${updated} updated, ${errors} errors`);
} else {
  console.log('\nNo Excel file found. Problem statements can be imported through the admin panel.');
  console.log('Place your Excel file as: ' + possiblePaths[0]);
}

db.close();
console.log('\n✅ Setup complete!');
console.log('Admin login: admin@veltech.edu.in / Admin@XHub2026');
console.log('Run: npm run dev');
