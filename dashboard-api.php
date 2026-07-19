<?php
/**
 * Dashboard MySQL API — load/save dashboard-data.json via MySQL
 * Place in /dashboard/ alongside dashboard.html
 * 
 * GET  ?action=load  → returns JSON
 * POST ?action=save  → saves JSON body
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// ── Database config ──────────────────────────────────────────────
// Set these via Hostinger hPanel → MySQL Databases
$DB_HOST = getenv('DASHBOARD_DB_HOST') ?: 'localhost';
$DB_NAME = getenv('DASHBOARD_DB_NAME') ?: 'REPLACE_WITH_DB_NAME';
$DB_USER = getenv('DASHBOARD_DB_USER') ?: 'REPLACE_WITH_DB_USER';
$DB_PASS = getenv('DASHBOARD_DB_PASS') ?: 'REPLACE_WITH_DB_PASS';

// ── CORS preflight ───────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Connect ──────────────────────────────────────────────────────
try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'msg' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

// ── Auto-create table ────────────────────────────────────────────
$pdo->exec("CREATE TABLE IF NOT EXISTS dashboard_data (
    id INT PRIMARY KEY DEFAULT 1,
    data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

// Seed if empty
$count = $pdo->query("SELECT COUNT(*) FROM dashboard_data")->fetchColumn();
if ($count == 0) {
    $pdo->exec("INSERT INTO dashboard_data (id, data) VALUES (1, '{}')");
}

$action = $_GET['action'] ?? '';

// ── LOAD ─────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'load') {
    $row = $pdo->query("SELECT data, updated_at FROM dashboard_data WHERE id = 1")->fetch();
    $data = json_decode($row['data'], true);
    $data['lastUpdated'] = $row['updated_at'];
    echo json_encode($data);
    exit;
}

// ── SAVE ─────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);

    if ($data === null) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'msg' => 'Invalid JSON']);
        exit;
    }

    // Remove lastUpdated — MySQL handles the timestamp
    unset($data['lastUpdated']);

    $stmt = $pdo->prepare("UPDATE dashboard_data SET data = ? WHERE id = 1");
    $stmt->execute([json_encode($data, JSON_UNESCAPED_UNICODE)]);

    $updated = $pdo->query("SELECT updated_at FROM dashboard_data WHERE id = 1")->fetch();

    echo json_encode(['ok' => true, 'lastUpdated' => $updated['updated_at']]);
    exit;
}

// ── 404 ──────────────────────────────────────────────────────────
http_response_code(404);
echo json_encode(['ok' => false, 'msg' => 'Unknown action. Use ?action=load or ?action=save']);
