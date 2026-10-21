<?php
/**
 * Environment configuration loader
 * Loads variables from .env.local or .env in the parent directory, or system environment.
 */

function load_env() {
    static $loaded = false;
    if ($loaded) return;
    $loaded = true;

    $candidates = [
        __DIR__ . '/../../.env.local',
        __DIR__ . '/../../.env',
        __DIR__ . '/../.env.local',
        __DIR__ . '/../.env',
    ];

    foreach ($candidates as $file) {
        if (file_exists($file) && is_readable($file)) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) continue;
                if (str_contains($line, '=')) {
                    [$key, $val] = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val);
                    // Strip quotes if present
                    if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                        (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                        $val = substr($val, 1, -1);
                    }
                    if (!array_key_exists($key, $_ENV)) {
                        $_ENV[$key] = $val;
                        putenv("$key=$val");
                    }
                }
            }
            break;
        }
    }
}

function env($key, $default = null) {
    load_env();
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    $val = getenv($key);
    return ($val !== false) ? $val : $default;
}
