<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

function handle_departments_get() {
    $departments = db_query('SELECT * FROM departments WHERE is_active = 1 ORDER BY name');
    json_response(['departments' => $departments]);
}
