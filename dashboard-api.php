<?php
/**
 * Dashboard MySQL API v2 — load/save dashboard data via MySQL
 * 
 * GET  ?action=load   → returns JSON from MySQL
 * POST ?action=save   → saves JSON body to MySQL
 * GET  ?action=debug  → diagnostic info
 * GET  ?action=ping   → simple health check
 */

// ── Show ALL errors so we can diagnose the 500 ────────────────────
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set a fatal error handler so even parse-level crashes output JSON
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json', true, 500);
        echo json_encode([
            'ok' => false,
            'fatal' => true,
            'msg' => $error['message'],
            'file' => $error['file'],
            'line' => $error['line'],
        ]);
    }
});

// ── CORS + JSON + Anti-cache headers ────────────────────────────
// Safari iOS aggressively caches API responses even with no-cache.
// These headers + client-side cache-busting (?t=timestamp) prevent stale data.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Ping — simplest possible health check ────────────────────────
$action = isset($_GET['action']) ? $_GET['action'] : '';
if ($action === 'ping') {
    echo json_encode(['ok' => true, 'php' => PHP_VERSION, 'time' => date('c')]);
    exit;
}

// ── Load DB credentials from env file ─────────────────────────────
$envFile = null;
$possible = [
    __DIR__ . '/env.dashboard',
    __DIR__ . '/env/env.dashboard',
    __DIR__ . '/../env.dashboard',
];
foreach ($possible as $f) {
    if (file_exists($f)) { $envFile = $f; break; }
}

$envVars = [];
if ($envFile) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;  // PHP 7.x safe
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $envVars[trim($parts[0])] = trim($parts[1]);
            }
        }
    }
}

// DB config — env file → getenv → hardcoded fallback
$DB_HOST = isset($envVars['DASHBOARD_DB_HOST']) ? $envVars['DASHBOARD_DB_HOST'] : (getenv('DASHBOARD_DB_HOST') ?: 'localhost');
$DB_NAME = isset($envVars['DASHBOARD_DB_NAME']) ? $envVars['DASHBOARD_DB_NAME'] : (getenv('DASHBOARD_DB_NAME') ?: 'u885017975_dashboard');
$DB_USER = isset($envVars['DASHBOARD_DB_USER']) ? $envVars['DASHBOARD_DB_USER'] : (getenv('DASHBOARD_DB_USER') ?: 'u885017975_dashboard');
$DB_PASS = isset($envVars['DASHBOARD_DB_PASS']) ? $envVars['DASHBOARD_DB_PASS'] : (getenv('DASHBOARD_DB_PASS') ?: 'nushTisn35#');

// ── Debug action ──────────────────────────────────────────────────
if ($action === 'debug') {
    echo json_encode([
        'ok' => true,
        'php_version' => PHP_VERSION,
        '__DIR__' => __DIR__,
        'env_file' => $envFile,
        'env_file_exists' => $envFile ? true : false,
        'env_files_checked' => $possible,
        'env_vars_found' => array_keys($envVars),
        'DB_HOST' => $DB_HOST,
        'DB_NAME' => $DB_NAME,
        'DB_USER' => $DB_USER,
        'DB_PASS_len' => strlen($DB_PASS),
        'pdo_available' => extension_loaded('pdo'),
        'pdo_mysql_available' => extension_loaded('pdo_mysql'),
    ], JSON_PRETTY_PRINT);
    exit;
}

// ── Connect to MySQL ──────────────────────────────────────────────
try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'msg' => 'DB connection failed: ' . $e->getMessage(),
        'host' => $DB_HOST,
        'db' => $DB_NAME,
    ]);
    exit;
}

// ── Auto-create table ─────────────────────────────────────────────
$pdo->exec("CREATE TABLE IF NOT EXISTS dashboard_data (
    id INT PRIMARY KEY DEFAULT 1,
    data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$count = $pdo->query("SELECT COUNT(*) FROM dashboard_data")->fetchColumn();
if ($count == 0) {
    $pdo->exec("INSERT INTO dashboard_data (id, data) VALUES (1, '{}')");
}

// ── LOAD ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'load') {
    $row = $pdo->query("SELECT data, updated_at FROM dashboard_data WHERE id = 1")->fetch();
    if (!$row) {
        echo json_encode(['ok' => false, 'msg' => 'No data row found']);
        exit;
    }
    $data = json_decode($row['data'], true);
    if ($data === null) {
        $data = [];
    }
    // Prefer the client's own lastUpdated (stored on save) — the dashboard compares it
    // against its local cache timestamp, and both are client-clock values, so "which is
    // newer" stays correct regardless of server clock skew. Fall back to the DB row time
    // only for rows saved before this fix.
    if (empty($data['lastUpdated'])) {
        $data['lastUpdated'] = $row['updated_at'];
    }
    $json = json_encode($data);
    // JSONP support for Safari (script tag loads bypass CORS/issues)
    if (isset($_GET['callback']) && preg_match('/^[a-zA-Z_][a-zA-Z0-9_.]+$/', $_GET['callback'])) {
        header('Content-Type: application/javascript');
        echo $_GET['callback'] . '(' . $json . ');';
    } else {
        echo $json;
    }
    exit;
}

// ── SAVE ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);

    if ($data === null) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Invalid JSON']);
        exit;
    }

    // Keep the client's lastUpdated in the stored row (see load above).
    $clientTs = isset($data['lastUpdated']) ? $data['lastUpdated'] : null;

    $stmt = $pdo->prepare("UPDATE dashboard_data SET data = ? WHERE id = 1");
    $stmt->execute([json_encode($data, JSON_UNESCAPED_UNICODE)]);

    $updated = $pdo->query("SELECT updated_at FROM dashboard_data WHERE id = 1")->fetch();

    echo json_encode(['ok' => true, 'lastUpdated' => $clientTs ?: $updated['updated_at']]);
    exit;
}

// ── 404 ───────────────────────────────────────────────────────────
http_response_code(404);
echo json_encode(['ok' => false, 'msg' => 'Unknown action. Use ?action=load, ?action=save, ?action=debug, or ?action=ping']);
