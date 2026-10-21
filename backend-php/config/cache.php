<?php

function get_cache_dir(): string {
    static $dir = null;
    if ($dir === null) {
        $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'xhub_cache';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
    }
    return $dir;
}

function cache_get(string $key) {
    $file = get_cache_dir() . DIRECTORY_SEPARATOR . md5($key) . '.cache';
    if (!file_exists($file)) {
        return null;
    }

    $raw = @file_get_contents($file);
    if ($raw === false) {
        return null;
    }

    $data = @unserialize($raw);
    if (!is_array($data) || !isset($data['expires']) || !array_key_exists('val', $data)) {
        @unlink($file);
        return null;
    }

    if (time() > $data['expires']) {
        @unlink($file);
        return null;
    }

    return $data['val'];
}

function cache_set(string $key, $value, int $ttlSeconds = 60): void {
    $file = get_cache_dir() . DIRECTORY_SEPARATOR . md5($key) . '.cache';
    $data = [
        'expires' => time() + $ttlSeconds,
        'val' => $value,
    ];
    @file_put_contents($file, serialize($data), LOCK_EX);
}

function cache_delete(string $key): void {
    $file = get_cache_dir() . DIRECTORY_SEPARATOR . md5($key) . '.cache';
    if (file_exists($file)) {
        @unlink($file);
    }
}

function cache_clear_pattern(string $prefix = ''): void {
    $dir = get_cache_dir();
    $files = @glob($dir . DIRECTORY_SEPARATOR . '*.cache');
    if ($files) {
        foreach ($files as $f) {
            @unlink($f);
        }
    }
}
