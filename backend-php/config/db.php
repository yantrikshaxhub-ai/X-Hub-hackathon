<?php
require_once __DIR__ . '/env.php';

function getDb(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $driver = env('DB_DRIVER', 'mysql'); // 'mysql' (TiDB) or 'pgsql' (PostgreSQL)
    $host = env('TIDB_HOST', env('DB_HOST', 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com'));
    $port = env('TIDB_PORT', env('DB_PORT', ($driver === 'pgsql' ? '5432' : '4000')));
    $dbname = env('TIDB_DATABASE', env('DB_DATABASE', 'xhubhack'));
    $user = env('TIDB_USER', env('DB_USER', '2eAdwtaQKjkweGo.root'));
    $pass = env('TIDB_PASSWORD', env('DB_PASSWORD', 'WlFXPmU3OQVc5m0p'));

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => true,
    ];

    if ($driver === 'pgsql') {
        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";
        $pdo = new PDO($dsn, $user, $pass, $options);
    } else {
        // MySQL / TiDB Cloud (TiDB Cloud requires SSL)
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        $options[PDO::MYSQL_ATTR_SSL_CA] = '';
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    return $pdo;
}

function db_query(string $sql, array $params = []): array {
    $stmt = getDb()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function db_query_one(string $sql, array $params = []): ?array {
    $stmt = getDb()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return ($row !== false) ? $row : null;
}

function db_execute(string $sql, array $params = []): array {
    $db = getDb();
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return [
        'insertId' => (int)$db->lastInsertId(),
        'affectedRows' => $stmt->rowCount(),
    ];
}

function db_transaction(callable $callback) {
    $db = getDb();
    $db->beginTransaction();
    try {
        $res = $callback($db);
        $db->commit();
        return $res;
    } catch (\Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
}
