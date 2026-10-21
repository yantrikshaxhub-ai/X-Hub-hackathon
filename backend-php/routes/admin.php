<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/mail.php';

function handle_admin_overview() {
    requireAdmin();

    $totalPS = (int)(db_query_one('SELECT COUNT(*) as c FROM problem_statements')['c'] ?? 0);
    $totalStudents = (int)(db_query_one('SELECT COUNT(*) as c FROM students WHERE is_active = 1')['c'] ?? 0);
    $totalFaculty = (int)(db_query_one('SELECT COUNT(*) as c FROM faculty WHERE is_active = 1')['c'] ?? 0);
    $totalRegistrations = (int)(db_query_one("SELECT COUNT(*) as c FROM registrations WHERE status = 'active'")['c'] ?? 0);
    $totalTeams = (int)(db_query_one("SELECT COUNT(*) as c FROM teams WHERE status != 'dissolved'")['c'] ?? 0);
    $pendingInvitations = (int)(db_query_one("SELECT COUNT(*) as c FROM invitations WHERE status = 'pending'")['c'] ?? 0);
    $needsReview = (int)(db_query_one('SELECT COUNT(*) as c FROM problem_statements WHERE needs_config_review = 1')['c'] ?? 0);
    $openPS = (int)(db_query_one('SELECT COUNT(*) as c FROM problem_statements WHERE registration_open = 1')['c'] ?? 0);

    $detailedRegistrations = db_query("
      SELECT 
        r.id as registration_id,
        r.status as registration_status,
        r.registered_at,
        s.id as student_id,
        s.full_name as student_name,
        s.vt_number,
        s.email as student_email,
        s.academic_year,
        s.skills,
        d.id as department_id,
        COALESCE(d.name, 'School of Computing') as department_name,
        COALESCE(d.code, 'SoC') as department_code,
        ps.id as problem_statement_id,
        ps.ps_id,
        ps.title as problem_title,
        c.id as company_id,
        COALESCE(c.name, 'Industry Partner') as company_name
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN problem_statements ps ON r.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE r.status = 'active'
      ORDER BY r.registered_at DESC
    ");

    $companyMap = [];
    foreach ($detailedRegistrations as $reg) {
        $cName = $reg['company_name'] ?? 'Industry Partner';
        if (!isset($companyMap[$cName])) {
            $companyMap[$cName] = ['company' => $cName, 'count' => 0, 'students' => []];
        }
        $companyMap[$cName]['count']++;
        $companyMap[$cName]['students'][] = $reg;
    }
    $byCompany = array_values($companyMap);
    usort($byCompany, fn($a, $b) => $b['count'] <=> $a['count']);

    $deptMap = [];
    foreach ($detailedRegistrations as $reg) {
        $dName = $reg['department_name'] ?? 'School of Computing';
        $dCode = $reg['department_code'] ?? 'SoC';
        if (!isset($deptMap[$dName])) {
            $deptMap[$dName] = ['department' => $dName, 'code' => $dCode, 'count' => 0, 'students' => []];
        }
        $deptMap[$dName]['count']++;
        $deptMap[$dName]['students'][] = $reg;
    }
    $byDepartment = array_values($deptMap);
    usort($byDepartment, fn($a, $b) => $b['count'] <=> $a['count']);

    $fullPSRow = db_query_one("
      SELECT COUNT(*) as c FROM problem_statements ps
      WHERE ps.max_registrations > 0
      AND (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') >= ps.max_registrations
    ");
    $fullPS = (int)($fullPSRow['c'] ?? 0);

    json_response([
        'metrics' => [
            'totalPS' => $totalPS,
            'totalStudents' => $totalStudents,
            'totalFaculty' => $totalFaculty,
            'totalRegistrations' => $totalRegistrations,
            'totalTeams' => $totalTeams,
            'pendingInvitations' => $pendingInvitations,
            'needsReview' => $needsReview,
            'openPS' => $openPS,
            'fullPS' => $fullPS,
        ],
        'byCompany' => $byCompany,
        'byDepartment' => $byDepartment,
        'detailedRegistrations' => $detailedRegistrations,
    ]);
}

function handle_admin_problems_get() {
    requireAdmin();

    $search = $_GET['search'] ?? null;
    $company = $_GET['company'] ?? null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, (int)($_GET['limit'] ?? 20));
    $offset = ($page - 1) * $limit;

    $where = 'WHERE 1=1';
    $params = [];

    if ($search) {
        $where .= ' AND (ps.ps_id LIKE ? OR ps.title LIKE ? OR c.name LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    if ($company) {
        $where .= ' AND c.name = ?';
        $params[] = $company;
    }

    $totalRow = db_query_one("SELECT COUNT(*) as c FROM problem_statements ps LEFT JOIN companies c ON ps.company_id = c.id $where", $params);
    $total = (int)($totalRow['c'] ?? 0);

    $sql = "
      SELECT ps.*, c.name as company_name,
        (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') as registration_count,
        (SELECT COUNT(*) FROM teams t WHERE t.problem_statement_id = ps.id AND t.status != 'dissolved') as team_count,
        (SELECT COUNT(*) FROM invitations i WHERE i.problem_statement_id = ps.id AND i.status = 'pending') as pending_pings
      FROM problem_statements ps
      LEFT JOIN companies c ON ps.company_id = c.id
      $where
      ORDER BY ps.sno ASC
      LIMIT $limit OFFSET $offset
    ";

    $problems = db_query($sql, $params);

    json_response([
        'problems' => $problems,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => ceil($total / $limit),
    ]);
}

function handle_admin_problems_patch() {
    $admin = requireAdmin();
    $body = get_json_body();
    $id = (int)($body['id'] ?? 0);

    if (!$id) bad_request('id is required');

    $ps = db_query_one('SELECT * FROM problem_statements WHERE id = ?', [$id]);
    if (!$ps) not_found('Problem statement not found');

    $updates = [];
    $params = [];

    if (isset($body['max_registrations'])) {
        $val = (int)$body['max_registrations'];
        if ($val < 0) bad_request('max_registrations must be a non-negative integer');
        $updates[] = 'max_registrations = ?';
        $params[] = $val;
    }
    if (isset($body['max_pings_per_student'])) {
        $val = (int)$body['max_pings_per_student'];
        if ($val < 0) bad_request('max_pings_per_student must be a non-negative integer');
        $updates[] = 'max_pings_per_student = ?';
        $params[] = $val;
    }
    if (isset($body['max_team_members'])) {
        $val = (int)$body['max_team_members'];
        if ($val < 0) bad_request('max_team_members must be a non-negative integer');
        $updates[] = 'max_team_members = ?';
        $params[] = $val;
    }
    if (isset($body['registration_open'])) {
        $updates[] = 'registration_open = ?';
        $params[] = $body['registration_open'] ? 1 : 0;
    }

    if (empty($updates)) bad_request('No valid fields to update');

    if (isset($body['max_registrations']) && isset($body['max_pings_per_student']) && isset($body['max_team_members'])) {
        $updates[] = 'needs_config_review = 0';
    }

    $updates[] = 'updated_at = NOW()';
    $params[] = $id;

    $setClause = implode(', ', $updates);
    db_execute("UPDATE problem_statements SET $setClause WHERE id = ?", $params);

    db_execute("
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES ('admin', ?, ?, 'UPDATE_PS_SETTINGS', 'problem_statement', ?, ?)
    ", [$admin['id'], $admin['name'], $id, json_encode($body)]);

    $updated = db_query_one('SELECT * FROM problem_statements WHERE id = ?', [$id]);
    json_response(['problem' => $updated, 'message' => 'Settings updated successfully']);
}

function handle_admin_teams_get() {
    requireAdmin();

    $search = $_GET['search'] ?? null;
    $status = $_GET['status'] ?? null;

    $where = "WHERE t.status != 'dissolved'";
    $params = [];

    if ($status) {
        $where .= ' AND t.status = ?';
        $params[] = $status;
    }
    if ($search) {
        $where .= ' AND (t.name LIKE ? OR ps.ps_id LIKE ? OR ps.title LIKE ? OR s.full_name LIKE ? OR c.name LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $teams = db_query("
      SELECT t.id, t.name, t.status, t.created_at, t.updated_at,
             ps.id as problem_statement_id, ps.ps_id, ps.title as problem_title, ps.max_team_members,
             c.name as company_name,
             s.id as lead_student_id, s.full_name as lead_name, s.vt_number as lead_vt, s.email as lead_email,
             d.name as lead_dept_name, d.code as lead_dept_code
      FROM teams t
      JOIN problem_statements ps ON t.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      LEFT JOIN students s ON t.created_by_student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      $where
      ORDER BY t.created_at DESC
    ", $params);

    $teamIds = array_map(fn($t) => (int)$t['id'], $teams);
    $memMap = [];

    if (!empty($teamIds)) {
        $placeholders = implode(',', array_fill(0, count($teamIds), '?'));
        $members = db_query("
          SELECT tm.team_id, tm.role, tm.joined_at,
                 s.id as student_id, s.full_name as student_name, s.vt_number, s.email, s.skills,
                 d.name as department_name, d.code as department_code
          FROM team_memberships tm
          JOIN students s ON tm.student_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE tm.team_id IN ($placeholders)
          ORDER BY tm.joined_at ASC
        ", $teamIds);

        foreach ($members as $m) {
            $memMap[$m['team_id']][] = $m;
        }
    }

    $result = array_map(function($t) use ($memMap) {
        $t['members'] = $memMap[$t['id']] ?? [];
        $t['member_count'] = count($t['members']);
        return $t;
    }, $teams);

    json_response(['teams' => $result, 'total' => count($result)]);
}

function handle_admin_teams_patch() {
    $admin = requireAdmin();
    $body = get_json_body();
    $teamId = (int)($body['team_id'] ?? 0);
    $status = $body['status'] ?? '';

    if (!$teamId || !$status) bad_request('team_id and status are required');

    db_execute("UPDATE teams SET status = ?, updated_at = NOW() WHERE id = ?", [$status, $teamId]);

    db_execute("
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES ('admin', ?, ?, 'UPDATE_TEAM_STATUS', 'team', ?, ?)
    ", [$admin['id'], $admin['name'], $teamId, json_encode(['status' => $status])]);

    json_response(['success' => true, 'message' => "Team status updated to $status"]);
}

function handle_admin_faculty_get() {
    requireAdmin();

    $faculty = db_query("
      SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise, f.is_active, f.created_at,
             d.id as department_id, d.name as department_name, d.code as department_code,
             (SELECT COUNT(*) FROM mentor_assignments ma WHERE ma.faculty_id = f.id) as assigned_ps_count
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.is_active = 1
      ORDER BY f.name ASC
    ");

    $facultyIds = array_map(fn($f) => (int)$f['id'], $faculty);
    $assignMap = [];

    if (!empty($facultyIds)) {
        $placeholders = implode(',', array_fill(0, count($facultyIds), '?'));
        $assignments = db_query("
          SELECT ma.faculty_id, ma.assigned_at, ps.id as problem_statement_id, ps.ps_id, ps.title, c.name as company_name
          FROM mentor_assignments ma
          JOIN problem_statements ps ON ma.problem_statement_id = ps.id
          LEFT JOIN companies c ON ps.company_id = c.id
          WHERE ma.faculty_id IN ($placeholders)
        ", $facultyIds);

        foreach ($assignments as $a) {
            $assignMap[$a['faculty_id']][] = $a;
        }
    }

    $result = array_map(function($f) use ($assignMap) {
        $f['assigned_problems'] = $assignMap[$f['id']] ?? [];
        return $f;
    }, $faculty);

    json_response(['faculty' => $result]);
}

function handle_admin_faculty_post() {
    $admin = requireAdmin();
    $body = get_json_body();
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $phone = isset($body['phone']) ? trim($body['phone']) : null;
    $department_id = $body['department_id'] ?? null;
    $designation = $body['designation'] ?? 'Assistant Professor';
    $expertise = $body['expertise'] ?? null;
    $password = $body['password'] ?? 'Faculty@XHub2026';

    if (!$name) bad_request('Faculty name is required');
    if (!$email) bad_request('Email is required');

    $existing = db_query_one('SELECT id FROM faculty WHERE email = ?', [$email]);
    if ($existing) bad_request('A faculty member with this email already exists');

    $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $res = db_execute("
      INSERT INTO faculty (name, email, phone, department_id, designation, expertise, password_hash, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ", [$name, $email, $phone, $department_id ?: null, $designation, $expertise, $password_hash]);
    $facultyId = $res['insertId'];

    db_execute("
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES ('admin', ?, ?, 'CREATE_FACULTY', 'faculty', ?, ?)
    ", [$admin['id'], $admin['name'], $facultyId, json_encode(['name' => $name, 'email' => $email, 'designation' => $designation])]);

    $created = db_query_one("
      SELECT f.*, d.name as department_name, d.code as department_code 
      FROM faculty f 
      LEFT JOIN departments d ON f.department_id = d.id 
      WHERE f.id = ?
    ", [$facultyId]);

    json_response(['faculty' => $created, 'message' => 'Faculty member created successfully'], 201);
}

function handle_admin_faculty_assign_post() {
    $admin = requireAdmin();
    $body = get_json_body();
    $faculty_ids = $body['faculty_ids'] ?? [];
    $problem_statement_ids = $body['problem_statement_ids'] ?? [];

    if (!is_array($faculty_ids) || empty($faculty_ids)) {
        bad_request('faculty_ids must be a non-empty array of IDs');
    }
    if (!is_array($problem_statement_ids) || empty($problem_statement_ids)) {
        bad_request('problem_statement_ids must be a non-empty array of IDs');
    }

    $assignedCount = 0;
    foreach ($faculty_ids as $fId) {
        foreach ($problem_statement_ids as $psId) {
            try {
                db_execute("
                  INSERT INTO mentor_assignments (faculty_id, problem_statement_id, assigned_at)
                  VALUES (?, ?, NOW())
                  ON DUPLICATE KEY UPDATE assigned_at = NOW()
                ", [(int)$fId, (int)$psId]);
                $assignedCount++;
            } catch (\Throwable $e) {}
        }
    }

    db_execute("
      INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, new_data)
      VALUES ('admin', ?, ?, 'ASSIGN_FACULTY_MENTOR', 'mentor_assignment', ?, ?)
    ", [$admin['id'], $admin['name'], (int)$faculty_ids[0], json_encode(['faculty_ids' => $faculty_ids, 'problem_statement_ids' => $problem_statement_ids])]);

    // Dispatch emails
    try {
        foreach ($faculty_ids as $fId) {
            $faculty = db_query_one("
              SELECT f.name, f.email, f.phone, COALESCE(d.name, 'Engineering') as dept_name
              FROM faculty f
              LEFT JOIN departments d ON f.department_id = d.id
              WHERE f.id = ?
            ", [(int)$fId]);

            if (!$faculty) continue;

            foreach ($problem_statement_ids as $psId) {
                $ps = db_query_one("
                  SELECT ps.ps_id, ps.title, c.name as company_name
                  FROM problem_statements ps
                  LEFT JOIN companies c ON ps.company_id = c.id
                  WHERE ps.id = ?
                ", [(int)$psId]);

                if (!$ps) continue;

                sendMentorAssignedToFacultyEmail(
                    $faculty['email'],
                    $faculty['name'],
                    $ps['ps_id'],
                    $ps['title'],
                    $ps['company_name'] ?? 'Industry Partner'
                );

                $students = db_query("
                  SELECT s.full_name, s.email
                  FROM registrations r
                  JOIN students s ON r.student_id = s.id
                  WHERE r.problem_statement_id = ? AND r.status = 'active'
                ", [(int)$psId]);

                foreach ($students as $st) {
                    sendMentorAssignedToStudentEmail(
                        $st['email'],
                        $st['full_name'],
                        $faculty['name'],
                        $faculty['dept_name'],
                        $faculty['email'],
                        $faculty['phone'] ?? null,
                        $ps['ps_id'],
                        $ps['title']
                    );
                }
            }
        }
    } catch (\Throwable $e) {}

    json_response([
        'success' => true,
        'assignedCount' => $assignedCount,
        'message' => 'Successfully assigned mentor(s) to problem statement(s).',
    ]);
}

function handle_admin_faculty_assign_delete() {
    requireAdmin();
    $facultyId = $_GET['faculty_id'] ?? null;
    $psId = $_GET['problem_statement_id'] ?? null;

    if (!$facultyId || !$psId) {
        bad_request('faculty_id and problem_statement_id are required');
    }

    db_execute('DELETE FROM mentor_assignments WHERE faculty_id = ? AND problem_statement_id = ?', [(int)$facultyId, (int)$psId]);
    json_response(['success' => true, 'message' => 'Mentor assignment removed.']);
}

function handle_admin_import() {
    requireAdmin();
    // Provides status overview of imported problem statements
    $counts = db_query_one('
      SELECT 
        (SELECT COUNT(*) FROM problem_statements) as total_problems,
        (SELECT COUNT(*) FROM companies) as total_companies,
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT COUNT(*) FROM faculty) as total_faculty
    ');

    json_response([
        'status' => 'ready',
        'counts' => $counts,
        'message' => 'Import subsystem operational.'
    ]);
}
