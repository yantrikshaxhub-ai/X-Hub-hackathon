<?php
require_once __DIR__ . '/env.php';

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function get_jwt_secret(): string {
    return env('JWT_SECRET', 'xhub-hackathon-secret-key-change-in-production-2026');
}

/**
 * Sign payload using HS256 HMAC SHA256 (compatible with jose)
 */
function signToken(array $payload, int $ttlSeconds = 604800): string {
    $now = time();
    $payload['iat'] = $now;
    if (!isset($payload['exp'])) {
        $payload['exp'] = $now + $ttlSeconds; // 7 days default
    }

    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payloadJson = json_encode($payload);

    $base64Header = base64url_encode($header);
    $base64Payload = base64url_encode($payloadJson);

    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", get_jwt_secret(), true);
    $base64Signature = base64url_encode($signature);

    return "$base64Header.$base64Payload.$base64Signature";
}

/**
 * Verify HS256 token and return payload if valid, null otherwise
 */
function verifyToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$base64Header, $base64Payload, $base64Signature] = $parts;

    $signature = base64url_decode($base64Signature);
    $expectedSignature = hash_hmac('sha256', "$base64Header.$base64Payload", get_jwt_secret(), true);

    if (!hash_equals($expectedSignature, $signature)) {
        return null;
    }

    $payloadJson = base64url_decode($base64Payload);
    $payload = json_decode($payloadJson, true);

    if (!is_array($payload)) {
        return null;
    }

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null; // Expired
    }

    return $payload;
}
