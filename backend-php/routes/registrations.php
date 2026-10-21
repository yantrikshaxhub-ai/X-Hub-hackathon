<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/mail.php';
require_once __DIR__ . '/../config/cache.php';

function handle_registrations_get() {
    $student = requireStudent();
    $studentId = (int)$student['id'];

    $registrations = db_query("
      SELECT r.id, r.status, r.registered_at,
        ps.id as ps_db_id, ps.ps_id, ps.title, ps.sno,
        ps.max_registrations, ps.max_pings_per_student, ps.max_team_members,
        ps.registration_open,
        c.name as company_name,
        (SELECT COUNT(*) FROM registrations r2 WHERE r2.problem_statement_id = ps.id AND r2.status = 'active') as total_registered,
        (SELECT pqu.pings_sent FROM ping_quota_usage pqu WHERE pqu.student_id = ? AND pqu.problem_statement_id = ps.id) as pings_sent,
        (SELECT tm.team_id FROM team_memberships tm 
          JOIN teams t ON tm.team_id = t.id
          WHERE tm.student_id = ? AND t.problem_statement_id = ps.id AND t.status != 'dissolved'
          LIMIT 1) as team_id
      FROM registrations r
      JOIN problem_statements ps ON r.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE r.student_id = ?
      ORDER BY r.registered_at DESC
    ", [$studentId, $studentId, $studentId]);

    $result = [];
    foreach ($registrations as $reg) {
        $mentors = db_query("
            SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
                   COALESCE(d.name, 'Academic Department') as department_name,
                   COALESCE(d.code, 'FAC') as department_code
            FROM mentor_assignments ma
            JOIN faculty f ON ma.faculty_id = f.id
            LEFT JOIN departments d ON f.department_id = d.id
            WHERE ma.problem_statement_id = ? AND f.is_active = 1
        ", [$reg['ps_db_id']]);
        $reg['mentors'] = $mentors;
        $result[] = $reg;
    }

    json_response(['registrations' => $result]);
}

function handle_registrations_post() {
    $student = requireStudent();
    $studentId = (int)$student['id'];
    $body = get_json_body();
    $psId = (int)($body['problem_statement_id'] ?? 0);

    if (!$psId) bad_request('problem_statement_id is required');

    $problem = db_query_one("
      SELECT id, ps_id, title, max_registrations, registration_open,
        (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = id AND r.status = 'active') as current_count
      FROM problem_statements WHERE id = ?
    ", [$psId]);

    if (!$problem) not_found('Problem statement not found');
    if (!$problem['registration_open']) bad_request('Registration is closed for this problem statement');

    $existing = db_query_one("
      SELECT id, status FROM registrations WHERE student_id = ? AND problem_statement_id = ?
    ", [$studentId, $psId]);

    if ($existing) {
        if ($existing['status'] === 'active') {
            bad_request('You are already registered for this problem statement');
        }
        if ($existing['status'] === 'withdrawn') {
            if ($problem['max_registrations'] > 0 && (int)$problem['current_count'] >= (int)$problem['max_registrations']) {
                bad_request('This problem statement has reached its maximum registrations');
            }
            db_execute("UPDATE registrations SET status = 'active', updated_at = NOW() WHERE id = ?", [$existing['id']]);
            json_response(['message' => 'Registration re-activated', 'id' => (int)$existing['id']]);
        }
    }

    if ($problem['max_registrations'] > 0 && (int)$problem['current_count'] >= (int)$problem['max_registrations']) {
        bad_request('This problem statement has reached its maximum registration limit');
    }

    $res = db_execute("
      INSERT INTO registrations (student_id, problem_statement_id, status)
      VALUES (?, ?, 'active')
    ", [$studentId, $psId]);

    // Initialize ping quota
    db_execute("
      INSERT IGNORE INTO ping_quota_usage (student_id, problem_statement_id, pings_sent)
      VALUES (?, ?, 0)
    ", [$studentId, $psId]);

    // Dispatch email
    try {
        $fullPS = db_query_one("
          SELECT ps.ps_id, ps.title, c.name as company_name 
          FROM problem_statements ps
          LEFT JOIN companies c ON ps.company_id = c.id
          WHERE ps.id = ?
        ", [$psId]);
        $stu = db_query_one('SELECT full_name, email FROM students WHERE id = ?', [$studentId]);
        if ($stu && $fullPS) {
            sendProblemRegistrationEmail(
                $stu['email'],
                $stu['full_name'],
                $fullPS['ps_id'],
                $fullPS['title'],
                $fullPS['company_name'] ?? 'Industry Partner'
            );
        }
    } catch (\Throwable $e) {
        error_log('[Mail] PS registration email error: ' . $e->getMessage());
    }

    cache_clear_pattern();

    json_response(['message' => 'Registered successfully', 'id' => $res['insertId']], 201);
}

function handle_registration_delete($id) {
    $student = requireStudent();
    $studentId = (int)$student['id'];

    $reg = db_query_one("
      SELECT r.id, r.status, r.problem_statement_id
      FROM registrations r
      WHERE r.id = ? AND r.student_id = ?
    ", [$id, $studentId]);

    if (!$reg) not_found('Registration not found');
    if ($reg['status'] !== 'active') bad_request('Registration is not active');

    $teamMembership = db_query_one("
      SELECT tm.id FROM team_memberships tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.student_id = ? AND t.problem_statement_id = ? AND t.status != 'dissolved'
    ", [$studentId, $reg['problem_statement_id']]);

    if ($teamMembership) {
        bad_request('You must leave your team before withdrawing from this problem statement');
    }

    db_execute("UPDATE registrations SET status = 'withdrawn', updated_at = NOW() WHERE id = ?", [$reg['id']]);
    cache_clear_pattern();
    json_response(['message' => 'Registration withdrawn successfully']);
}
