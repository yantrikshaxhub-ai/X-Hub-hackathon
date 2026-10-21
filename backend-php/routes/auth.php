<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/mail.php';

function handle_auth_login() {
    $body = get_json_body();
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $role = $body['role'] ?? 'student';

    if (!$email || !$password) {
        bad_request('Email and password are required');
    }

    if ($role === 'admin') {
        $admin = db_query_one('SELECT * FROM admins WHERE email = ? AND is_active = 1', [$email]);
        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            bad_request('Invalid credentials');
        }

        // Log audit
        db_execute(
            'INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', $admin['id'], $admin['name'], 'LOGIN', 'admin', $admin['id']]
        );

        $token = signToken([
            'type' => 'admin',
            'id' => (int)$admin['id'],
            'email' => $admin['email'],
            'name' => $admin['name'],
            'role' => $admin['role'],
        ]);

        header("Set-Cookie: xhub_token=$token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
        json_response([
            'token' => $token,
            'user' => [
                'id' => (int)$admin['id'],
                'name' => $admin['name'],
                'email' => $admin['email'],
                'role' => $admin['role'],
                'type' => 'admin',
            ],
        ]);
    } elseif ($role === 'faculty') {
        $faculty = db_query_one(
            'SELECT f.*, d.name as department_name, d.code as department_code 
             FROM faculty f 
             LEFT JOIN departments d ON f.department_id = d.id 
             WHERE f.email = ? AND f.is_active = 1',
            [$email]
        );

        if (!$faculty || !password_verify($password, $faculty['password_hash'])) {
            bad_request('Invalid faculty credentials');
        }

        db_execute(
            'INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)',
            ['faculty', $faculty['id'], $faculty['name'], 'LOGIN', 'faculty', $faculty['id']]
        );

        $token = signToken([
            'type' => 'faculty',
            'id' => (int)$faculty['id'],
            'email' => $faculty['email'],
            'name' => $faculty['name'],
            'department_id' => $faculty['department_id'],
            'designation' => $faculty['designation'],
        ]);

        header("Set-Cookie: xhub_token=$token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
        json_response([
            'token' => $token,
            'user' => [
                'id' => (int)$faculty['id'],
                'name' => $faculty['name'],
                'email' => $faculty['email'],
                'designation' => $faculty['designation'],
                'department_name' => $faculty['department_name'],
                'department_code' => $faculty['department_code'],
                'type' => 'faculty',
            ],
        ]);
    } else {
        $student = db_query_one('SELECT * FROM students WHERE email = ? AND is_active = 1', [$email]);
        if (!$student || !password_verify($password, $student['password_hash'])) {
            bad_request('Invalid credentials');
        }

        $token = signToken([
            'type' => 'student',
            'id' => (int)$student['id'],
            'email' => $student['email'],
            'name' => $student['full_name'],
            'vt_number' => $student['vt_number'],
        ]);

        header("Set-Cookie: xhub_token=$token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
        json_response([
            'token' => $token,
            'user' => [
                'id' => (int)$student['id'],
                'name' => $student['full_name'],
                'email' => $student['email'],
                'vt_number' => $student['vt_number'],
                'type' => 'student',
            ],
        ]);
    }
}

function handle_auth_register() {
    $body = get_json_body();
    $type = $body['type'] ?? 'student';
    $name = trim($body['full_name'] ?? $body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $phone = isset($body['phone']) ? trim($body['phone']) : null;
    $password = $body['password'] ?? '';
    $department_id = $body['department_id'] ?? null;
    $academic_year = $body['academic_year'] ?? null;
    $skills = $body['skills'] ?? null;
    $designation = $body['designation'] ?? 'Assistant Professor';
    $expertise = $body['expertise'] ?? $skills ?? null;

    if (!$name) bad_request('Name is required');
    if (!$email) bad_request('Email is required');
    if (strlen($password) < 8) bad_request('Password must be at least 8 characters');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) bad_request('Invalid email format');

    if ($type === 'faculty') {
        $existing = db_query_one('SELECT id FROM faculty WHERE email = ?', [$email]);
        if ($existing) bad_request('A faculty account with this email already exists');

        $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $res = db_execute(
            'INSERT INTO faculty (name, email, phone, department_id, designation, expertise, password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$name, $email, $phone, $department_id, $designation, $expertise, $password_hash]
        );
        $facultyId = $res['insertId'];

        $token = signToken([
            'type' => 'faculty',
            'id' => $facultyId,
            'email' => $email,
            'name' => $name,
            'department_id' => $department_id,
            'designation' => $designation,
        ]);

        header("Set-Cookie: xhub_token=$token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
        json_response([
            'token' => $token,
            'user' => [
                'id' => $facultyId,
                'name' => $name,
                'email' => $email,
                'designation' => $designation,
                'type' => 'faculty',
            ],
        ], 201);
    } else {
        $vt_number = strtoupper(trim($body['vt_number'] ?? ''));
        if (!$vt_number) bad_request('VT Number is required');
        if (!$department_id) bad_request('Department is required');

        $existingEmail = db_query_one('SELECT id FROM students WHERE email = ?', [$email]);
        if ($existingEmail) bad_request('An account with this email already exists');

        $existingVT = db_query_one('SELECT id FROM students WHERE vt_number = ?', [$vt_number]);
        if ($existingVT) bad_request('An account with this VT number already exists');

        $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $res = db_execute(
            'INSERT INTO students (full_name, vt_number, email, department_id, academic_year, skills, password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$name, $vt_number, $email, $department_id, $academic_year, $skills, $password_hash]
        );
        $studentId = $res['insertId'];

        // Dispatch welcome email asynchronously
        try {
            $dept = db_query_one('SELECT name FROM departments WHERE id = ?', [$department_id]);
            sendWelcomeEmail($email, $name, $vt_number, $dept['name'] ?? 'Vel Tech Engineering');
        } catch (\Throwable $e) {
            error_log('[Mail] Welcome email error: ' . $e->getMessage());
        }

        $token = signToken([
            'type' => 'student',
            'id' => $studentId,
            'email' => $email,
            'name' => $name,
            'vt_number' => $vt_number,
        ]);

        header("Set-Cookie: xhub_token=$token; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800");
        json_response([
            'token' => $token,
            'user' => [
                'id' => $studentId,
                'name' => $name,
                'email' => $email,
                'vt_number' => $vt_number,
                'type' => 'student',
            ],
        ], 201);
    }
}

function handle_auth_me() {
    $auth = getAuthUser();
    if (!$auth) {
        json_response(['user' => null]);
    }

    if ($auth['type'] === 'student') {
        $student = db_query_one(
            'SELECT s.id, s.full_name, s.vt_number, s.email, s.department_id, 
                    s.academic_year, s.skills, s.created_at,
                    d.name as department_name, d.code as department_code
             FROM students s
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.id = ? AND s.is_active = 1',
            [$auth['id']]
        );

        if (!$student) {
            json_response(['user' => null]);
        }

        $student['name'] = $student['full_name'];
        $student['type'] = 'student';
        json_response(['user' => $student]);
    } elseif ($auth['type'] === 'faculty') {
        $faculty = db_query_one(
            'SELECT f.id, f.name, f.email, f.phone, f.department_id, f.designation, f.expertise, f.created_at,
                    d.name as department_name, d.code as department_code
             FROM faculty f
             LEFT JOIN departments d ON f.department_id = d.id
             WHERE f.id = ? AND f.is_active = 1',
            [$auth['id']]
        );

        if (!$faculty) {
            json_response(['user' => null]);
        }

        $faculty['full_name'] = $faculty['name'];
        $faculty['type'] = 'faculty';
        json_response(['user' => $faculty]);
    } else {
        $admin = db_query_one(
            'SELECT id, name, email, role, created_at FROM admins WHERE id = ? AND is_active = 1',
            [$auth['id']]
        );

        if (!$admin) {
            json_response(['user' => null]);
        }

        $admin['full_name'] = $admin['name'];
        $admin['type'] = 'admin';
        json_response(['user' => $admin]);
    }
}

function handle_auth_logout() {
    header('Set-Cookie: xhub_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
    json_response(['success' => true]);
}
