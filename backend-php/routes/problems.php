<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/cache.php';

function handle_problems_list() {
    $company = $_GET['company'] ?? null;
    $department = $_GET['department'] ?? null;
    $search = $_GET['search'] ?? null;
    $status = $_GET['status'] ?? null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limitParam = $_GET['limit'] ?? '150';
    $limit = ($limitParam === 'all') ? 200 : max(1, (int)$limitParam);
    $offset = ($page - 1) * $limit;

    $cacheKey = "problems:" . ($company ?? '') . ":" . ($department ?? '') . ":" . ($search ?? '') . ":" . ($status ?? '') . ":{$page}:{$limit}";
    $cached = cache_get($cacheKey);
    if ($cached !== null) {
        header('X-Cache: HIT');
        header('Cache-Control: public, s-maxage=10, stale-while-revalidate=30');
        json_response($cached);
        return;
    }

    $where = 'WHERE 1=1';
    $params = [];

    if ($company) {
        $where .= ' AND c.name = ?';
        $params[] = $company;
    }

    if ($department) {
        $where .= ' AND (
            ps.department_raw LIKE ? OR ps.id IN (
                SELECT pde.problem_statement_id FROM problem_dept_eligibility pde
                JOIN departments d ON pde.department_id = d.id
                WHERE d.name LIKE ? OR d.code LIKE ?
            )
        )';
        $params[] = "%$department%";
        $params[] = "%$department%";
        $params[] = "%$department%";
    }

    if ($search) {
        $where .= ' AND (ps.ps_id LIKE ? OR ps.title LIKE ? OR c.name LIKE ? OR ps.description LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($status === 'open') {
        $where .= ' AND ps.registration_open = 1';
    } elseif ($status === 'closed') {
        $where .= ' AND ps.registration_open = 0';
    } elseif ($status === 'full') {
        $where .= ' AND ps.max_registrations > 0 AND COALESCE(r_agg.cnt, 0) >= ps.max_registrations';
    }

    $countSql = "SELECT COUNT(*) as total FROM problem_statements ps LEFT JOIN companies c ON ps.company_id = c.id $where";
    $totalRow = db_query_one($countSql, $params);
    $total = (int)($totalRow['total'] ?? 0);

    $sql = "
      SELECT 
        ps.id, ps.ps_id, ps.sno, ps.title, ps.description, ps.background,
        ps.expected_outcome, ps.remarks, ps.department_raw,
        ps.max_registrations, ps.max_pings_per_student, ps.max_team_members,
        ps.registration_open, ps.needs_config_review,
        c.id as company_id, c.name as company_name,
        COALESCE(r_agg.cnt, 0) as registration_count,
        COALESCE(t_agg.cnt, 0) as team_count
      FROM problem_statements ps
      LEFT JOIN companies c ON ps.company_id = c.id
      LEFT JOIN (
        SELECT problem_statement_id, COUNT(*) as cnt 
        FROM registrations 
        WHERE status = 'active' 
        GROUP BY problem_statement_id
      ) r_agg ON r_agg.problem_statement_id = ps.id
      LEFT JOIN (
        SELECT problem_statement_id, COUNT(*) as cnt 
        FROM teams 
        WHERE status != 'dissolved' 
        GROUP BY problem_statement_id
      ) t_agg ON t_agg.problem_statement_id = ps.id
      $where
      ORDER BY ps.sno ASC
      LIMIT $limit OFFSET $offset
    ";

    $problems = db_query($sql, $params);

    $problemIds = array_map(fn($p) => (int)$p['id'], $problems);
    $eligMap = [];
    $mentorMap = [];

    if (!empty($problemIds)) {
        $placeholders = implode(',', array_fill(0, count($problemIds), '?'));
        
        $eligRows = db_query("
            SELECT pde.problem_statement_id, d.id, d.name, d.code
            FROM problem_dept_eligibility pde
            JOIN departments d ON pde.department_id = d.id
            WHERE pde.problem_statement_id IN ($placeholders)
        ", $problemIds);

        foreach ($eligRows as $e) {
            $eligMap[$e['problem_statement_id']][] = [
                'id' => (int)$e['id'],
                'name' => $e['name'],
                'code' => $e['code'],
            ];
        }

        try {
            $mentorRows = db_query("
                SELECT ma.problem_statement_id, f.id, f.name, f.email, f.phone, f.designation, f.expertise, d.name as department_name, d.code as department_code
                FROM mentor_assignments ma
                JOIN faculty f ON ma.faculty_id = f.id
                LEFT JOIN departments d ON f.department_id = d.id
                WHERE ma.problem_statement_id IN ($placeholders)
            ", $problemIds);

            foreach ($mentorRows as $m) {
                $mentorMap[$m['problem_statement_id']][] = [
                    'id' => (int)$m['id'],
                    'name' => $m['name'],
                    'email' => $m['email'],
                    'phone' => $m['phone'] ?? null,
                    'designation' => $m['designation'],
                    'expertise' => $m['expertise'],
                    'department_name' => $m['department_name'],
                    'department_code' => $m['department_code'],
                ];
            }
        } catch (\Throwable $e) {}
    }

    $result = array_map(function($p) use ($eligMap, $mentorMap) {
        $p['id'] = (int)$p['id'];
        $p['departments'] = $eligMap[$p['id']] ?? [];
        $p['mentors'] = $mentorMap[$p['id']] ?? [];
        $maxReg = (int)($p['max_registrations'] ?? 0);
        $curReg = (int)($p['registration_count'] ?? 0);
        $p['registration_slots_remaining'] = ($maxReg > 0) ? max(0, $maxReg - $curReg) : null;
        return $p;
    }, $problems);

    $companies = cache_get('all:companies');
    if ($companies === null) {
        $companies = array_column(
            db_query('SELECT DISTINCT name FROM companies WHERE is_active = 1 ORDER BY name'),
            'name'
        );
        cache_set('all:companies', $companies, 300);
    }

    $departments = cache_get('all:departments');
    if ($departments === null) {
        $departments = db_query('SELECT id, name, code FROM departments WHERE is_active = 1 ORDER BY name');
        cache_set('all:departments', $departments, 300);
    }

    $payload = [
        'problems' => $result,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => ceil($total / $limit),
        'companies' => $companies,
        'departments' => $departments,
    ];

    cache_set($cacheKey, $payload, 15);
    header('X-Cache: MISS');
    header('Cache-Control: public, s-maxage=10, stale-while-revalidate=30');
    json_response($payload);
}

function handle_problem_detail($id) {
    $problem = db_query_one('
      SELECT 
        ps.id, ps.ps_id, ps.sno, ps.title, ps.description, ps.background,
        ps.expected_outcome, ps.remarks, ps.department_raw,
        ps.max_registrations, ps.max_pings_per_student, ps.max_team_members,
        ps.registration_open, ps.needs_config_review,
        c.id as company_id, c.name as company_name,
        (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = \'active\') as registration_count,
        (SELECT COUNT(*) FROM teams t WHERE t.problem_statement_id = ps.id AND t.status != \'dissolved\') as team_count
      FROM problem_statements ps
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE ps.id = ? OR ps.ps_id = ?
    ', [$id, $id]);

    if (!$problem) {
        not_found('Problem statement not found');
    }

    $psId = (int)$problem['id'];

    $departments = db_query('
      SELECT d.id, d.name, d.code
      FROM problem_dept_eligibility pde
      JOIN departments d ON pde.department_id = d.id
      WHERE pde.problem_statement_id = ?
    ', [$psId]);

    $mentors = db_query('
      SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
             d.name as department_name, d.code as department_code
      FROM mentor_assignments ma
      JOIN faculty f ON ma.faculty_id = f.id
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE ma.problem_statement_id = ? AND f.is_active = 1
    ', [$psId]);

    $problem['departments'] = $departments;
    $problem['mentors'] = $mentors;

    json_response(['problem' => $problem]);
}

function handle_problem_students($id) {
    $auth = getAuthUser();
    if (!$auth) {
        unauthorized('Please log in to view candidate directory');
    }

    $ps = db_query_one('SELECT id, ps_id, title, max_pings_per_student FROM problem_statements WHERE id = ? OR ps_id = ?', [$id, $id]);
    if (!$ps) {
        not_found('Problem statement not found');
    }

    $actualPsId = (int)$ps['id'];
    $currentUserId = (int)$auth['id'];
    $isStudent = ($auth['type'] === 'student');

    $students = db_query("
      SELECT s.id, s.full_name, s.vt_number, s.academic_year, s.skills,
             COALESCE(d.name, 'School of Computing') as department_name, 
             COALESCE(d.code, 'SoC') as department_code,
             r.registered_at,
             CASE WHEN s.id = ? THEN 1 ELSE 0 END as is_me,
             (SELECT status FROM invitations i 
              WHERE i.sender_id = ? AND i.recipient_id = s.id 
              AND i.problem_statement_id = ? AND i.status = 'pending'
              LIMIT 1) as pending_invite_status,
             (SELECT tm.team_id FROM team_memberships tm 
              JOIN teams t ON tm.team_id = t.id 
              WHERE tm.student_id = s.id AND t.problem_statement_id = ?
              AND t.status != 'dissolved' LIMIT 1) as has_team
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE r.problem_statement_id = ? AND r.status = 'active'
      ORDER BY r.registered_at ASC
    ", [$currentUserId, $currentUserId, $actualPsId, $actualPsId, $actualPsId]);

    $quota = null;
    if ($isStudent) {
        $quotaRow = db_query_one('
            SELECT pqu.pings_sent, ps.max_pings_per_student
            FROM problem_statements ps
            LEFT JOIN ping_quota_usage pqu ON pqu.student_id = ? AND pqu.problem_statement_id = ps.id
            WHERE ps.id = ?
        ', [$currentUserId, $actualPsId]);

        $pingsSent = (int)($quotaRow['pings_sent'] ?? 0);
        $maxPings = (int)($quotaRow['max_pings_per_student'] ?? 5);

        $quota = [
            'pings_sent' => $pingsSent,
            'max_pings_per_student' => $maxPings,
            'remaining' => ($maxPings > 0) ? max(0, $maxPings - $pingsSent) : null,
        ];
    }

    $mentors = db_query("
      SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
             COALESCE(d.name, 'Academic Department') as department_name,
             COALESCE(d.code, 'FAC') as department_code
      FROM mentor_assignments ma
      JOIN faculty f ON ma.faculty_id = f.id
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE ma.problem_statement_id = ? AND f.is_active = 1
    ", [$actualPsId]);

    json_response([
        'students' => $students,
        'quota' => $quota,
        'mentors' => $mentors,
        'problem' => array_merge($ps, ['mentors' => $mentors]),
    ]);
}
