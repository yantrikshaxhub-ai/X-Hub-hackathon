<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/mail.php';

function handle_invitations_get() {
    $student = requireStudent();
    $studentId = (int)$student['id'];
    $direction = $_GET['direction'] ?? 'all';

    $received = [];
    $sent = [];

    if ($direction === 'all' || $direction === 'received') {
        $received = db_query("
          SELECT i.id, i.status, i.message, i.created_at, i.updated_at,
                 s.id as sender_id, s.full_name as sender_name, s.vt_number as sender_vt,
                 d.name as sender_dept,
                 ps.id as ps_db_id, ps.ps_id, ps.title as ps_title,
                 c.name as company_name
          FROM invitations i
          JOIN students s ON i.sender_id = s.id
          LEFT JOIN departments d ON s.department_id = d.id
          JOIN problem_statements ps ON i.problem_statement_id = ps.id
          LEFT JOIN companies c ON ps.company_id = c.id
          WHERE i.recipient_id = ?
          ORDER BY i.created_at DESC
        ", [$studentId]);
    }

    if ($direction === 'all' || $direction === 'sent') {
        $sent = db_query("
          SELECT i.id, i.status, i.message, i.created_at, i.updated_at,
                 r.id as recipient_id, r.full_name as recipient_name, r.vt_number as recipient_vt,
                 d.name as recipient_dept,
                 ps.id as ps_db_id, ps.ps_id, ps.title as ps_title,
                 c.name as company_name
          FROM invitations i
          JOIN students r ON i.recipient_id = r.id
          LEFT JOIN departments d ON r.department_id = d.id
          JOIN problem_statements ps ON i.problem_statement_id = ps.id
          LEFT JOIN companies c ON ps.company_id = c.id
          WHERE i.sender_id = ?
          ORDER BY i.created_at DESC
        ", [$studentId]);
    }

    json_response(['received' => $received, 'sent' => $sent]);
}

function handle_invitations_post() {
    $student = requireStudent();
    $studentId = (int)$student['id'];
    $body = get_json_body();
    $recipient_id = (int)($body['recipient_id'] ?? 0);
    $problem_statement_id = (int)($body['problem_statement_id'] ?? 0);
    $message = isset($body['message']) ? trim($body['message']) : null;

    if (!$recipient_id || !$problem_statement_id) {
        bad_request('recipient_id and problem_statement_id are required');
    }

    if ($recipient_id === $studentId) {
        bad_request('You cannot send an invitation to yourself');
    }

    $problem = db_query_one('
      SELECT id, ps_id, max_pings_per_student, registration_open
      FROM problem_statements WHERE id = ?
    ', [$problem_statement_id]);

    if (!$problem) not_found('Problem statement not found');

    $senderReg = db_query_one('
      SELECT id FROM registrations WHERE student_id = ? AND problem_statement_id = ? AND status = \'active\'
    ', [$studentId, $problem_statement_id]);
    if (!$senderReg) bad_request('You must be registered for this problem statement to send invitations');

    $recipientReg = db_query_one('
      SELECT id FROM registrations WHERE student_id = ? AND problem_statement_id = ? AND status = \'active\'
    ', [$recipient_id, $problem_statement_id]);
    if (!$recipientReg) bad_request('Recipient is not registered for this problem statement');

    $existingInvite = db_query_one('
      SELECT id, status FROM invitations 
      WHERE sender_id = ? AND recipient_id = ? AND problem_statement_id = ? AND status = \'pending\'
    ', [$studentId, $recipient_id, $problem_statement_id]);
    if ($existingInvite) bad_request('A pending invitation already exists for this student');

    $quota = db_query_one('
      SELECT pings_sent FROM ping_quota_usage WHERE student_id = ? AND problem_statement_id = ?
    ', [$studentId, $problem_statement_id]);

    $pingsSent = (int)($quota['pings_sent'] ?? 0);
    $maxPings = (int)($problem['max_pings_per_student'] ?? 0);

    if ($maxPings > 0 && $pingsSent >= $maxPings) {
        bad_request('You have reached the maximum number of team invitations for this problem statement');
    }

    $res = db_execute("
      INSERT INTO invitations (sender_id, recipient_id, problem_statement_id, status, message)
      VALUES (?, ?, ?, 'pending', ?)
    ", [$studentId, $recipient_id, $problem_statement_id, $message]);
    $invitationId = $res['insertId'];

    // Increment quota
    db_execute("
      INSERT INTO ping_quota_usage (student_id, problem_statement_id, pings_sent)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE pings_sent = pings_sent + 1, updated_at = NOW()
    ", [$studentId, $problem_statement_id]);

    // Create notification
    db_execute("
      INSERT INTO notifications (student_id, type, title, message, data)
      VALUES (?, 'invitation', 'Team Invitation Received', ?, ?)
    ", [
        $recipient_id,
        "{$student['name']} has invited you to collaborate on {$problem['ps_id']}",
        json_encode(['invitation_id' => $invitationId, 'problem_statement_id' => $problem_statement_id])
    ]);

    // Dispatch email
    try {
        $recipient = db_query_one('SELECT full_name, email FROM students WHERE id = ?', [$recipient_id]);
        $sender = db_query_one('SELECT s.full_name, d.name as dept_name FROM students s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = ?', [$studentId]);
        $psRow = db_query_one('SELECT ps_id, title FROM problem_statements WHERE id = ?', [$problem_statement_id]);

        if ($recipient && $sender && $psRow) {
            sendTeamInvitationEmail(
                $recipient['email'],
                $recipient['full_name'],
                $sender['full_name'],
                $sender['dept_name'] ?? 'Engineering',
                $psRow['ps_id'],
                $psRow['title'],
                $message
            );
        }
    } catch (\Throwable $e) {
        error_log('[Mail] Team invitation error: ' . $e->getMessage());
    }

    json_response(['message' => 'Invitation sent successfully', 'id' => $invitationId], 201);
}

function handle_invitation_patch($id) {
    $student = requireStudent();
    $studentId = (int)$student['id'];
    $body = get_json_body();
    $action = $body['action'] ?? '';

    if (!in_array($action, ['accept', 'reject'])) {
        bad_request('action must be "accept" or "reject"');
    }

    $invitation = db_query_one('
      SELECT i.*, ps.max_team_members
      FROM invitations i
      JOIN problem_statements ps ON i.problem_statement_id = ps.id
      WHERE i.id = ?
    ', [$id]);

    if (!$invitation) not_found('Invitation not found');
    if ((int)$invitation['recipient_id'] !== $studentId) forbidden();
    if ($invitation['status'] !== 'pending') {
        bad_request("Cannot {$action} an invitation that is already {$invitation['status']}");
    }

    $psId = (int)$invitation['problem_statement_id'];
    $senderId = (int)$invitation['sender_id'];

    if ($action === 'reject') {
        db_execute("UPDATE invitations SET status = 'rejected', updated_at = NOW() WHERE id = ?", [$id]);

        db_execute("
          INSERT INTO notifications (student_id, type, title, message) VALUES (?, 'invitation_rejected', 'Invitation Rejected', ?)
        ", [$senderId, "{$student['name']} declined your team invitation"]);

        try {
            $sender = db_query_one('SELECT full_name, email FROM students WHERE id = ?', [$senderId]);
            $psRow = db_query_one('SELECT ps_id FROM problem_statements WHERE id = ?', [$psId]);
            if ($sender && $psRow) {
                sendInvitationResponseEmail($sender['email'], $sender['full_name'], $student['name'], false, $psRow['ps_id']);
            }
        } catch (\Throwable $e) {}

        json_response(['message' => 'Invitation rejected']);
    }

    // Accept action
    $existingTeam = db_query_one('
      SELECT tm.id FROM team_memberships tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.student_id = ? AND t.problem_statement_id = ? AND t.status != \'dissolved\'
    ', [$studentId, $psId]);

    if ($existingTeam) bad_request('You are already in a team for this problem statement');

    $teamId = $invitation['team_id'] ? (int)$invitation['team_id'] : null;

    if (!$teamId) {
        $senderTeam = db_query_one('
          SELECT tm.team_id FROM team_memberships tm
          JOIN teams t ON tm.team_id = t.id
          WHERE tm.student_id = ? AND t.problem_statement_id = ? AND t.status != \'dissolved\'
        ', [$senderId, $psId]);

        if ($senderTeam) {
            $teamId = (int)$senderTeam['team_id'];
        } else {
            $teamRes = db_execute("
              INSERT INTO teams (problem_statement_id, status, created_by_student_id)
              VALUES (?, 'forming', ?)
            ", [$psId, $senderId]);
            $teamId = $teamRes['insertId'];

            db_execute("
              INSERT IGNORE INTO team_memberships (team_id, student_id, role)
              VALUES (?, ?, 'leader')
            ", [$teamId, $senderId]);
        }
    }

    $teamInfo = db_query_one('
      SELECT t.id,
        (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = ?) as member_count,
        ps.max_team_members
      FROM teams t
      JOIN problem_statements ps ON t.problem_statement_id = ps.id
      WHERE t.id = ?
    ', [$teamId, $teamId]);

    if (!$teamInfo) bad_request('Team not found');

    $maxMembers = (int)($teamInfo['max_team_members'] ?? 0);
    $curMembers = (int)($teamInfo['member_count'] ?? 0);
    if ($maxMembers > 0 && $curMembers >= $maxMembers) {
        bad_request('The team has reached its maximum member limit');
    }

    db_execute("
      INSERT IGNORE INTO team_memberships (team_id, student_id, role)
      VALUES (?, ?, 'member')
    ", [$teamId, $studentId]);

    db_execute("UPDATE teams SET status = 'confirmed', updated_at = NOW() WHERE id = ?", [$teamId]);
    db_execute("UPDATE invitations SET status = 'accepted', team_id = ?, updated_at = NOW() WHERE id = ?", [$teamId, $id]);

    db_execute("
      INSERT INTO notifications (student_id, type, title, message, data)
      VALUES (?, 'invitation_accepted', 'Invitation Accepted', ?, ?)
    ", [$senderId, "{$student['name']} accepted your team invitation!", json_encode(['team_id' => $teamId])]);

    try {
        $sender = db_query_one('SELECT full_name, email FROM students WHERE id = ?', [$senderId]);
        $peerDept = db_query_one('SELECT d.name as dept_name FROM students s LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = ?', [$studentId]);
        $psRow = db_query_one('SELECT ps_id FROM problem_statements WHERE id = ?', [$psId]);
        if ($sender && $psRow) {
            sendInvitationResponseEmail(
                $sender['email'],
                $sender['full_name'],
                $student['name'],
                true,
                $psRow['ps_id'],
                $peerDept['dept_name'] ?? null
            );
        }
    } catch (\Throwable $e) {}

    json_response(['message' => 'Invitation accepted, you are now in the team', 'team_id' => $teamId]);
}

function handle_invitation_delete($id) {
    $student = requireStudent();
    $studentId = (int)$student['id'];

    $invitation = db_query_one('SELECT * FROM invitations WHERE id = ?', [$id]);
    if (!$invitation) not_found('Invitation not found');
    if ((int)$invitation['sender_id'] !== $studentId) forbidden();
    if ($invitation['status'] !== 'pending') {
        bad_request("Cannot cancel an invitation that is {$invitation['status']}");
    }

    db_execute("UPDATE invitations SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [$id]);
    json_response(['message' => 'Invitation cancelled']);
}
