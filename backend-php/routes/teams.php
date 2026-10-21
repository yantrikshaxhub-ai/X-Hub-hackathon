<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';

function handle_teams_get() {
    $student = requireStudent();
    $studentId = (int)$student['id'];

    $teams = db_query("
      SELECT t.id, t.status, t.created_at,
             ps.id as ps_db_id, ps.ps_id, ps.title as ps_title,
             ps.max_team_members,
             c.name as company_name,
             (SELECT COUNT(*) FROM team_memberships tm2 WHERE tm2.team_id = t.id) as member_count
      FROM team_memberships tm
      JOIN teams t ON tm.team_id = t.id
      JOIN problem_statements ps ON t.problem_statement_id = ps.id
      LEFT JOIN companies c ON ps.company_id = c.id
      WHERE tm.student_id = ? AND t.status != 'dissolved'
      ORDER BY t.created_at DESC
    ", [$studentId]);

    $result = [];
    foreach ($teams as $team) {
        $teamId = (int)$team['id'];
        $psDbId = (int)$team['ps_db_id'];

        $members = db_query("
          SELECT tm.role, tm.joined_at,
                 s.id, s.full_name, s.vt_number, s.academic_year, s.skills,
                 d.name as department_name
          FROM team_memberships tm
          JOIN students s ON tm.student_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE tm.team_id = ?
          ORDER BY tm.joined_at ASC
        ", [$teamId]);

        $mentors = db_query("
          SELECT f.id, f.name, f.email, f.phone, f.designation, f.expertise,
                 COALESCE(d.name, 'Academic Department') as department_name,
                 COALESCE(d.code, 'FAC') as department_code
          FROM mentor_assignments ma
          JOIN faculty f ON ma.faculty_id = f.id
          LEFT JOIN departments d ON f.department_id = d.id
          WHERE ma.problem_statement_id = ? AND f.is_active = 1
        ", [$psDbId]);

        $maxMembers = (int)($team['max_team_members'] ?? 0);
        $curMembers = (int)($team['member_count'] ?? 0);

        $team['members'] = $members;
        $team['mentors'] = $mentors;
        $team['slots_remaining'] = ($maxMembers > 0) ? max(0, $maxMembers - $curMembers) : null;
        $result[] = $team;
    }

    json_response(['teams' => $result]);
}
