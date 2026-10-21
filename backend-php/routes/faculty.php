<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';

function handle_faculty_overview() {
    $faculty = requireFaculty();
    $facultyId = (int)$faculty['id'];

    $profile = db_query_one("
      SELECT f.id, f.name, f.email, f.designation, f.expertise,
             d.name as department_name, d.code as department_code
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.id = ?
    ", [$facultyId]);

    $assignedProblems = db_query("
      SELECT ps.id, ps.ps_id, ps.sno, ps.title, ps.description, ps.expected_outcome,
             ps.max_registrations, ps.max_team_members, ps.registration_open,
             c.name as company_name, ma.assigned_at,
             (SELECT COUNT(*) FROM registrations r WHERE r.problem_statement_id = ps.id AND r.status = 'active') as registration_count,
             (SELECT COUNT(*) FROM teams t WHERE t.problem_statement_id = ps.id AND t.status != 'dissolved') as team_count
      FROM mentor_assignments ma
      JOIN problem_statements ps ON ma.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE ma.faculty_id = ?
      ORDER BY ps.sno ASC
    ", [$facultyId]);

    $assignedPsIds = array_map(fn($p) => (int)$p['id'], $assignedProblems);

    $candidates = [];
    $teams = [];

    if (!empty($assignedPsIds)) {
        $placeholders = implode(',', array_fill(0, count($assignedPsIds), '?'));

        $candidates = db_query("
          SELECT r.id as registration_id, r.registered_at,
                 s.id as student_id, s.full_name as student_name, s.vt_number, s.email as student_email,
                 s.academic_year, s.skills,
                 COALESCE(d.name, 'School of Computing') as department_name,
                 COALESCE(d.code, 'SoC') as department_code,
                 ps.id as problem_statement_id, ps.ps_id, ps.title as problem_title,
                 c.name as company_name,
                 (SELECT tm.team_id FROM team_memberships tm 
                  JOIN teams t ON tm.team_id = t.id 
                  WHERE tm.student_id = s.id AND t.problem_statement_id = ps.id AND t.status != 'dissolved' 
                  LIMIT 1) as team_id
          FROM registrations r
          JOIN students s ON r.student_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          JOIN problem_statements ps ON r.problem_statement_id = ps.id
          LEFT JOIN companies c ON ps.company_id = c.id
          WHERE r.problem_statement_id IN ($placeholders) AND r.status = 'active'
          ORDER BY r.registered_at DESC
        ", $assignedPsIds);

        $teamRows = db_query("
          SELECT t.id, t.name, t.status, t.created_at,
                 ps.id as problem_statement_id, ps.ps_id, ps.title as problem_title,
                 c.name as company_name,
                 s.full_name as lead_name, s.vt_number as lead_vt, s.email as lead_email
          FROM teams t
          JOIN problem_statements ps ON t.problem_statement_id = ps.id
          LEFT JOIN companies c ON ps.company_id = c.id
          LEFT JOIN students s ON t.created_by_student_id = s.id
          WHERE t.problem_statement_id IN ($placeholders) AND t.status != 'dissolved'
          ORDER BY t.created_at DESC
        ", $assignedPsIds);

        $teamIds = array_map(fn($t) => (int)$t['id'], $teamRows);
        $memMap = [];

        if (!empty($teamIds)) {
            $tPlaceholders = implode(',', array_fill(0, count($teamIds), '?'));
            $members = db_query("
              SELECT tm.team_id, tm.role, s.full_name, s.vt_number, s.email, d.code as department_code
              FROM team_memberships tm
              JOIN students s ON tm.student_id = s.id
              LEFT JOIN departments d ON s.department_id = d.id
              WHERE tm.team_id IN ($tPlaceholders)
            ", $teamIds);

            foreach ($members as $m) {
                $memMap[$m['team_id']][] = $m;
            }
        }

        $teams = array_map(function($t) use ($memMap) {
            $t['members'] = $memMap[$t['id']] ?? [];
            return $t;
        }, $teamRows);
    }

    json_response([
        'profile' => $profile,
        'assignedProblems' => $assignedProblems,
        'candidates' => $candidates,
        'teams' => $teams,
        'totalAssignedPS' => count($assignedProblems),
        'totalCandidates' => count($candidates),
        'totalTeams' => count($teams),
    ]);
}
