<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';

function getAuthUser(): ?array {
    // 1. Check Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (str_starts_with($authHeader, 'Bearer ')) {
        $token = substr($authHeader, 7);
        $payload = verifyToken($token);
        if ($payload) return $payload;
    }

    // 2. Check Cookie
    $cookieToken = $_COOKIE['xhub_token'] ?? null;
    if ($cookieToken) {
        $payload = verifyToken($cookieToken);
        if ($payload) return $payload;
    }

    return null;
}

function requireStudent(): array {
    $auth = getAuthUser();
    if (!$auth || ($auth['type'] ?? '') !== 'student') {
        unauthorized('Please log in as a student');
    }
    return $auth;
}

function requireFaculty(): array {
    $auth = getAuthUser();
    if (!$auth || ($auth['type'] ?? '') !== 'faculty') {
        unauthorized('Please log in as faculty');
    }
    return $auth;
}

function requireAdmin(): array {
    $auth = getAuthUser();
    if (!$auth || ($auth['type'] ?? '') !== 'admin') {
        unauthorized('Admin authorization required');
    }
    return $auth;
}

function requireFacultyOrAdmin(): array {
    $auth = getAuthUser();
    if (!$auth || (!in_array($auth['type'] ?? '', ['faculty', 'admin']))) {
        unauthorized('Faculty or Admin authorization required');
    }
    return $auth;
}
