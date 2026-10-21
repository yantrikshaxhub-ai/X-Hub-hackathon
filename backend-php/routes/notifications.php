<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';

function handle_notifications_get() {
    $student = requireStudent();
    $studentId = (int)$student['id'];

    $notifications = db_query("
      SELECT * FROM notifications WHERE student_id = ?
      ORDER BY created_at DESC LIMIT 50
    ", [$studentId]);

    json_response(['notifications' => $notifications]);
}

function handle_notifications_patch() {
    $student = requireStudent();
    $studentId = (int)$student['id'];

    db_execute('UPDATE notifications SET is_read = 1 WHERE student_id = ?', [$studentId]);
    json_response(['message' => 'Notifications marked as read']);
}
