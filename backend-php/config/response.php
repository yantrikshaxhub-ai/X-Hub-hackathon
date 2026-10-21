<?php

function handle_cors() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        header("Access-Control-Allow-Origin: *");
    }
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function get_json_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function json_response($data, int $status = 200, array $headers = []) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    foreach ($headers as $k => $v) {
        header("$k: $v");
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function bad_request(string $message, $details = null) {
    $res = ['error' => $message];
    if ($details !== null) {
        $res['details'] = $details;
    }
    json_response($res, 400);
}

function unauthorized(string $message = 'Unauthorized') {
    json_response(['error' => $message], 401);
}

function forbidden(string $message = 'Forbidden') {
    json_response(['error' => $message], 403);
}

function not_found(string $message = 'Not found') {
    json_response(['error' => $message], 404);
}

function server_error(string $message = 'Internal server error') {
    json_response(['error' => $message], 500);
}
