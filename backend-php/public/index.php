<?php
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../routes/auth.php';
require_once __DIR__ . '/../routes/departments.php';
require_once __DIR__ . '/../routes/problems.php';
require_once __DIR__ . '/../routes/registrations.php';
require_once __DIR__ . '/../routes/teams.php';
require_once __DIR__ . '/../routes/invitations.php';
require_once __DIR__ . '/../routes/notifications.php';
require_once __DIR__ . '/../routes/faculty.php';
require_once __DIR__ . '/../routes/admin.php';

// Handle CORS headers
handle_cors();

// Parse requested route
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'HEAD') {
    $method = 'GET';
}

// Normalize URI (remove trailing slash except root)
if ($uri !== '/' && str_ends_with($uri, '/')) {
    $uri = rtrim($uri, '/');
}

try {
    // -------------------------------------------------------------
    // Health / Root check
    // -------------------------------------------------------------
    if ($uri === '/' || $uri === '/api' || $uri === '/api/health') {
        json_response([
            'status' => 'ok',
            'service' => 'X-Hub Hackathon PHP Backend API',
            'version' => '1.0.0',
            'time' => date('c'),
        ]);
    }

    // -------------------------------------------------------------
    // Auth Routes
    // -------------------------------------------------------------
    if ($uri === '/api/auth/login' && $method === 'POST') {
        handle_auth_login();
    }
    if ($uri === '/api/auth/register' && $method === 'POST') {
        handle_auth_register();
    }
    if ($uri === '/api/auth/me' && $method === 'GET') {
        handle_auth_me();
    }
    if ($uri === '/api/auth/logout' && $method === 'POST') {
        handle_auth_logout();
    }

    // -------------------------------------------------------------
    // Departments
    // -------------------------------------------------------------
    if ($uri === '/api/departments' && $method === 'GET') {
        handle_departments_get();
    }

    // -------------------------------------------------------------
    // Problems
    // -------------------------------------------------------------
    if ($uri === '/api/problems' && $method === 'GET') {
        handle_problems_list();
    }
    if (preg_match('#^/api/problems/([^/]+)/students$#', $uri, $matches) && $method === 'GET') {
        handle_problem_students(urldecode($matches[1]));
    }
    if (preg_match('#^/api/problems/([^/]+)$#', $uri, $matches) && $method === 'GET') {
        handle_problem_detail(urldecode($matches[1]));
    }

    // -------------------------------------------------------------
    // Registrations
    // -------------------------------------------------------------
    if ($uri === '/api/registrations') {
        if ($method === 'GET') handle_registrations_get();
        if ($method === 'POST') handle_registrations_post();
    }
    if (preg_match('#^/api/registrations/([^/]+)$#', $uri, $matches) && $method === 'DELETE') {
        handle_registration_delete(urldecode($matches[1]));
    }

    // -------------------------------------------------------------
    // Teams
    // -------------------------------------------------------------
    if ($uri === '/api/teams' && $method === 'GET') {
        handle_teams_get();
    }

    // -------------------------------------------------------------
    // Invitations
    // -------------------------------------------------------------
    if ($uri === '/api/invitations') {
        if ($method === 'GET') handle_invitations_get();
        if ($method === 'POST') handle_invitations_post();
    }
    if (preg_match('#^/api/invitations/([^/]+)$#', $uri, $matches)) {
        if ($method === 'PATCH') handle_invitation_patch(urldecode($matches[1]));
        if ($method === 'DELETE') handle_invitation_delete(urldecode($matches[1]));
    }

    // -------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------
    if ($uri === '/api/notifications') {
        if ($method === 'GET') handle_notifications_get();
        if ($method === 'PATCH') handle_notifications_patch();
    }

    // -------------------------------------------------------------
    // Faculty Overview
    // -------------------------------------------------------------
    if ($uri === '/api/faculty/overview' && $method === 'GET') {
        handle_faculty_overview();
    }

    // -------------------------------------------------------------
    // Admin Routes
    // -------------------------------------------------------------
    if ($uri === '/api/admin/overview' && $method === 'GET') {
        handle_admin_overview();
    }
    if ($uri === '/api/admin/problems') {
        if ($method === 'GET') handle_admin_problems_get();
        if ($method === 'PATCH') handle_admin_problems_patch();
    }
    if ($uri === '/api/admin/teams') {
        if ($method === 'GET') handle_admin_teams_get();
        if ($method === 'PATCH') handle_admin_teams_patch();
    }
    if ($uri === '/api/admin/faculty') {
        if ($method === 'GET') handle_admin_faculty_get();
        if ($method === 'POST') handle_admin_faculty_post();
    }
    if ($uri === '/api/admin/faculty/assign') {
        if ($method === 'POST') handle_admin_faculty_assign_post();
        if ($method === 'DELETE') handle_admin_faculty_assign_delete();
    }
    if ($uri === '/api/admin/import') {
        handle_admin_import();
    }

    // Route not found
    not_found("Endpoint $method $uri not found on PHP backend");

} catch (\Throwable $e) {
    error_log("Backend Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    server_error('Internal server error: ' . $e->getMessage());
}
