<?php
/* Point of Sales Inventory Management System - MySQL bridge. Every CRUD action in the app runs real SQL here. */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$DB_HOST = '127.0.0.1';
$DB_NAME = 'daniels_pos';
$DB_USER = 'root';
$DB_PASS = '';

try {
    $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'error' => 'Cannot connect to MySQL: ' . $e->getMessage()]);
    exit;
}

try {
    $hasNote = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='note'")->fetchColumn();
    if (!$hasNote) {
        $pdo->exec("ALTER TABLE transactions ADD COLUMN note VARCHAR(500) NOT NULL DEFAULT '' AFTER status");
    }
} catch (Throwable $e) {}

function respond(array $data): void
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function n($value, $default = 0)
{
    return is_numeric($value) ? $value + 0 : $default;
}

function dateOrNull($value)
{
    if (empty($value)) return null;
    $ts = strtotime($value);
    return $ts ? date('Y-m-d', $ts) : null;
}

function dtOrNull($value)
{
    if (empty($value)) return null;
    $ts = strtotime($value);
    return $ts ? date('Y-m-d H:i:s', $ts) : null;
}

function str($value, $max = 255)
{
    return mb_substr((string)($value ?? ''), 0, $max);
}

function rowsFor(string $sql, array $params = []): array
{
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

$action = $_GET['action'] ?? 'bootstrap';

/* ------------------------------------------------------------------ */
/* READ: rebuild the exact JS shape from normalized SQL tables         */
/* ------------------------------------------------------------------ */
if ($action === 'bootstrap') {
    $meta = rowsFor('SELECT seq, seed FROM meta WHERE id = 1');
    $db = [
        'meta'         => $meta ? ['seq' => (int)$meta[0]['seq'], 'seed' => $meta[0]['seed']] : ['seq' => 0, 'seed' => ''],
        'items'        => [],
        'ingredients'  => [],
        'transactions' => [],
        'customers'    => [],
        'users'        => [],
        'itemCats'     => [],
        'ingCats'      => [],
    ];

    foreach (rowsFor("SELECT name FROM categories WHERE kind = 'item' ORDER BY sort_order, name") as $r) {
        $db['itemCats'][] = $r['name'];
    }
    foreach (rowsFor("SELECT name FROM categories WHERE kind = 'ingredient' ORDER BY sort_order, name") as $r) {
        $db['ingCats'][] = $r['name'];
    }

    $recipes = [];
    foreach (rowsFor('SELECT item_id, name, qty FROM item_recipes ORDER BY item_id, name') as $r) {
        $recipes[$r['item_id']][] = ['name' => $r['name'], 'qty' => (float)$r['qty']];
    }

    foreach (rowsFor('SELECT * FROM items ORDER BY sort_order, id') as $r) {
        $db['items'][] = [
            'id'        => $r['id'],
            'name'      => $r['name'],
            'barcode'   => $r['barcode'],
            'category'  => $r['category'],
            'price'     => (float)$r['price'],
            'cost'      => (float)$r['cost'],
            'stock'     => (float)$r['stock'],
            'minStock'  => (float)$r['min_stock'],
            'expiry'    => $r['expiry'] ?? '',
            'recipe'    => $recipes[$r['id']] ?? [],
        ];
    }

    foreach (rowsFor('SELECT * FROM ingredients ORDER BY sort_order, id') as $r) {
        $db['ingredients'][] = [
            'id'        => $r['id'],
            'name'      => $r['name'],
            'category'  => $r['category'],
            'unit'      => $r['unit'],
            'stock'     => (float)$r['stock'],
            'minStock'  => (float)$r['min_stock'],
            'expiry'    => $r['expiry'] ?? '',
        ];
    }

    $lines = [];
    foreach (rowsFor('SELECT tx_id, name, qty, price FROM transaction_items ORDER BY tx_id, position') as $r) {
        $lines[$r['tx_id']][] = [
            'name'  => $r['name'],
            'qty'   => (float)$r['qty'],
            'price' => (float)$r['price'],
        ];
    }

    foreach (rowsFor('SELECT * FROM transactions ORDER BY sort_order, id') as $r) {
        $db['transactions'][] = [
            'id'         => $r['id'],
            'ref'        => $r['ref'],
            'date'       => $r['date'] ? date('c', strtotime($r['date'])) : '',
            'items'      => $lines[$r['id']] ?? [],
            'subtotal'   => (float)$r['subtotal'],
            'discount'   => (float)$r['discount'],
            'total'      => (float)$r['total'],
            'payment'    => (float)$r['payment'],
            'change'     => (float)$r['change'],
            'cashier'    => $r['cashier'],
            'cashierId'  => $r['cashier_id'],
            'customer'   => $r['customer'],
            'customerId' => $r['customer_id'],
            'orderType'  => $r['order_type'],
            'note'       => $r['note'],
            'status'     => $r['status'],
        ];
    }

    foreach (rowsFor('SELECT * FROM customers ORDER BY sort_order, id') as $r) {
        $db['customers'][] = [
            'id'      => $r['id'],
            'name'    => $r['name'],
            'phone'   => $r['phone'],
            'email'   => $r['email'],
            'address' => $r['address'],
            'created' => $r['created'] ? date('c', strtotime($r['created'])) : '',
        ];
    }

    foreach (rowsFor('SELECT * FROM users ORDER BY sort_order, id') as $r) {
        $db['users'][] = [
            'id'       => $r['id'],
            'username' => $r['username'],
            'password' => $r['password'],
            'name'     => $r['name'],
            'role'     => $r['role'],
        ];
    }

    $empty = empty($db['users']) && empty($db['items']) && empty($db['ingredients'])
        && empty($db['transactions']) && empty($db['customers']);

    respond(['ok' => true, 'empty' => $empty, 'db' => $db]);
}

/* ------------------------------------------------------------------ */
/* WRITE: real INSERT / UPDATE / DELETE per table inside one transaction */
/* ------------------------------------------------------------------ */
if ($action === 'save') {
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        respond(['ok' => false, 'error' => 'Invalid JSON payload']);
    }

    $pdo->beginTransaction();

    try {
        $sync = function (string $table, string $pk, array $records, array $cols) use ($pdo) {
            $columns = array_merge([$pk], array_keys($cols), ['sort_order']);
            $ids = array_column($records, $pk);
            $sort = 0;

            if ($ids) {
                $marks = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $pdo->prepare("DELETE FROM `{$table}` WHERE `{$pk}` NOT IN ({$marks})");
                $stmt->execute($ids);
            } else {
                $pdo->exec("DELETE FROM `{$table}`");
            }

            $insertCols = implode(',', array_map(fn($c) => "`{$c}`", $columns));
            $placeholders = implode(',', array_fill(0, count($columns), '?'));
            $updates = [];
            foreach ($columns as $c) {
                if ($c !== $pk) $updates[] = "`{$c}` = VALUES(`{$c}`)";
            }
            $sql = "INSERT INTO `{$table}` ({$insertCols}) VALUES ({$placeholders})"
                 . ' ON DUPLICATE KEY UPDATE ' . implode(', ', $updates);
            $stmt = $pdo->prepare($sql);

            foreach ($records as $record) {
                $values = [(string)($record[$pk] ?? '')];
                foreach ($cols as $col => $formatter) {
                    $values[] = $formatter($record[$col] ?? null);
                }
                $values[] = $sort++;
                $stmt->execute($values);
            }
        };

        $sync('users', 'id', $data['users'] ?? [], [
            'username'  => fn($v) => str($v, 100),
            'password'  => fn($v) => str($v, 255),
            'name'      => fn($v) => str($v, 150),
            'role'      => fn($v) => str($v, 30),
        ]);

        $sync('items', 'id', $data['items'] ?? [], [
            'name'      => fn($v) => str($v, 150),
            'barcode'   => fn($v) => str($v, 60),
            'category'  => fn($v) => str($v, 60),
            'price'     => fn($v) => n($v),
            'cost'      => fn($v) => n($v),
            'stock'     => fn($v) => n($v),
            'min_stock' => fn($v) => n($v),
            'expiry'    => fn($v) => dateOrNull($v),
        ]);

        $sync('ingredients', 'id', $data['ingredients'] ?? [], [
            'name'      => fn($v) => str($v, 150),
            'category'  => fn($v) => str($v, 60),
            'unit'      => fn($v) => str($v, 30),
            'stock'     => fn($v) => n($v),
            'min_stock' => fn($v) => n($v),
            'expiry'    => fn($v) => dateOrNull($v),
        ]);

        $sync('customers', 'id', $data['customers'] ?? [], [
            'name'      => fn($v) => str($v, 150),
            'phone'     => fn($v) => str($v, 60),
            'email'     => fn($v) => str($v, 150),
            'address'   => fn($v) => str($v, 255),
            'created'   => fn($v) => dtOrNull($v),
        ]);

        $sync('transactions', 'id', $data['transactions'] ?? [], [
            'ref'         => fn($v) => str($v, 60),
            'date'        => fn($v) => dtOrNull($v),
            'subtotal'    => fn($v) => n($v),
            'discount'    => fn($v) => n($v),
            'total'       => fn($v) => n($v),
            'payment'     => fn($v) => n($v),
            'change'      => fn($v) => n($v),
            'cashier'     => fn($v) => str($v, 150),
            'cashier_id'  => fn($v) => str($v, 40),
            'customer'    => fn($v) => str($v, 150),
            'customer_id' => fn($v) => str($v, 40),
            'order_type'  => fn($v) => str($v, 40),
            'note'        => fn($v) => str($v, 500),
            'status'      => fn($v) => str($v, 30),
        ]);

        $pdo->exec('DELETE FROM item_recipes');
        $recStmt = $pdo->prepare('INSERT INTO item_recipes (item_id, name, qty) VALUES (?, ?, ?)
                                  ON DUPLICATE KEY UPDATE qty = VALUES(qty)');
        foreach ($data['items'] ?? [] as $item) {
            foreach ($item['recipe'] ?? [] as $r) {
                $recStmt->execute([(string)$item['id'], str($r['name'] ?? '', 150), n($r['qty'] ?? 0)]);
            }
        }

        $pdo->exec('DELETE FROM transaction_items');
        $lineStmt = $pdo->prepare('INSERT INTO transaction_items (tx_id, position, name, qty, price)
                                   VALUES (?, ?, ?, ?, ?)');
        foreach ($data['transactions'] ?? [] as $tx) {
            foreach ($tx['items'] ?? [] as $pos => $line) {
                $lineStmt->execute([
                    (string)$tx['id'],
                    (int)$pos,
                    str($line['name'] ?? '', 150),
                    n($line['qty'] ?? 0),
                    n($line['price'] ?? 0),
                ]);
            }
        }

        $pdo->exec('DELETE FROM categories');
        $catStmt = $pdo->prepare('INSERT INTO categories (kind, name, sort_order) VALUES (?, ?, ?)');
        foreach ($data['itemCats'] ?? [] as $i => $cat) {
            $catStmt->execute(['item', str($cat, 60), $i]);
        }
        foreach ($data['ingCats'] ?? [] as $i => $cat) {
            $catStmt->execute(['ingredient', str($cat, 60), $i]);
        }

        $meta = $data['meta'] ?? [];
        $metaStmt = $pdo->prepare('INSERT INTO meta (id, seq, seed) VALUES (1, ?, ?)
                                   ON DUPLICATE KEY UPDATE seq = VALUES(seq), seed = VALUES(seed)');
        $metaStmt->execute([n($meta['seq'] ?? 0), str($meta['seed'] ?? '', 50)]);

        $pdo->commit();

        respond([
            'ok' => true,
            'counts' => [
                'users'        => count($data['users'] ?? []),
                'items'        => count($data['items'] ?? []),
                'ingredients'  => count($data['ingredients'] ?? []),
                'transactions' => count($data['transactions'] ?? []),
                'customers'    => count($data['customers'] ?? []),
            ],
        ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'error' => $e->getMessage()]);
    }
}

/* ------------------------------------------------------------------ */
/* AUDIT TRAIL — separate from the synced business data               */
/* ------------------------------------------------------------------ */
if ($action === 'audit') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(['ok' => false, 'error' => 'Invalid audit payload']);
    try {
        $stmt = $pdo->prepare('INSERT INTO audit_log
            (ts, actor_id, actor_name, actor_username, actor_role, action, entity, entity_id, summary, before_json, after_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            dtOrNull($data['ts'] ?? null) ?: date('Y-m-d H:i:s'),
            str($data['actor_id'] ?? '', 40),
            str($data['actor_name'] ?? '', 150),
            str($data['actor_username'] ?? '', 100),
            str($data['actor_role'] ?? '', 30),
            str($data['action'] ?? 'edit', 20),
            str($data['entity'] ?? '', 40),
            str($data['entity_id'] ?? '', 60),
            str($data['summary'] ?? '', 255),
            isset($data['before']) ? str($data['before'], 16000) : null,
            isset($data['after']) ? str($data['after'], 16000) : null,
        ]);
        respond(['ok' => true, 'id' => $pdo->lastInsertId()]);
    } catch (Throwable $e) {
        respond(['ok' => false, 'error' => $e->getMessage()]);
    }
}

if ($action === 'logs') {
    $limit = min(max((int)($_GET['limit'] ?? 300), 1), 2000);
    $rows = rowsFor('SELECT * FROM audit_log ORDER BY ts DESC, id DESC LIMIT ' . $limit);
    respond(['ok' => true, 'logs' => $rows]);
}

/* ------------------------------------------------------------------ */
/* SCHEDULES — expected days / time in / time out per user              */
/* ------------------------------------------------------------------ */
if ($action === 'schedules') {
    $rows = rowsFor("SELECT s.* FROM schedules s JOIN users u ON u.id = s.user_id
                     WHERE u.role IN ('cashier', 'inventory', 'staff')
                     ORDER BY u.sort_order, s.user_id");
    respond(['ok' => true, 'rows' => $rows]);
}

if ($action === 'schedule-save') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(['ok' => false, 'error' => 'Invalid schedule payload']);

    $uid = str($data['user_id'] ?? '', 40);
    if ($uid === '') respond(['ok' => false, 'error' => 'Missing user_id']);

    $target = rowsFor('SELECT role FROM users WHERE id = ?', [$uid]);
    if (!$target || !in_array($target[0]['role'], ['cashier', 'inventory', 'staff'], true)) {
        respond(['ok' => false, 'error' => 'Cashier / Inventory lang ang may schedule']);
    }

    $allowedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    $daysIn = $data['days'] ?? [];
    if (!is_array($daysIn)) $daysIn = array_map('trim', explode(',', (string)$daysIn));
    $days = array_values(array_intersect($allowedDays, array_map('str', $daysIn)));
    if (!$days) respond(['ok' => false, 'error' => 'Pumili ng kahit isang araw sa Week 1']);

    $days2In = $data['days2'] ?? $days;
    if (!is_array($days2In)) $days2In = array_map('trim', explode(',', (string)$days2In));
    $days2 = array_values(array_intersect($allowedDays, array_map('str', $days2In)));
    if (!$days2) $days2 = $days;

    $timeRe = '/^([01]\d|2[0-3]):[0-5]\d$/';
    $start = str($data['start_time'] ?? '', 5);
    $end = str($data['end_time'] ?? '', 5);
    if (!preg_match($timeRe, $start) || !preg_match($timeRe, $end)) {
        respond(['ok' => false, 'error' => 'Invalid time format']);
    }

    $now = date('Y-m-d H:i:s');
    try {
        $stmt = $pdo->prepare('INSERT INTO schedules (user_id, days, days2, start_time, end_time, grace_min, updated_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?)
                               ON DUPLICATE KEY UPDATE days = VALUES(days), days2 = VALUES(days2), start_time = VALUES(start_time),
                                   end_time = VALUES(end_time), grace_min = VALUES(grace_min), updated_at = VALUES(updated_at)');
        $stmt->execute([
            $uid,
            implode(',', $days),
            implode(',', $days2),
            $start,
            $end,
            min(max((int)($data['grace_min'] ?? 10), 0), 240),
            $now,
        ]);
        $row = rowsFor('SELECT * FROM schedules WHERE user_id = ?', [$uid])[0];
        respond(['ok' => true, 'row' => $row]);
    } catch (Throwable $e) {
        respond(['ok' => false, 'error' => $e->getMessage()]);
    }
}

/* ------------------------------------------------------------------ */
/* ATTENDANCE — time in / out with lunch & coffee breaks                */
/* ------------------------------------------------------------------ */
if ($action === 'attendance') {
    $date = $_GET['date'] ?? date('Y-m-d');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $date = date('Y-m-d');
    $rows = rowsFor('SELECT * FROM attendance WHERE work_date = ? ORDER BY name, username', [$date]);
    respond(['ok' => true, 'date' => $date, 'rows' => $rows]);
}

if ($action === 'punch') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) respond(['ok' => false, 'error' => 'Invalid punch payload']);

    $map = [
        'time_in'    => ['time_in', 'in'],
        'lunch_out'  => ['lunch_out', 'lunch'],
        'lunch_in'   => ['lunch_in', 'back'],
        'coffee_out' => ['coffee_out', 'coffee'],
        'coffee_in'  => ['coffee_in', 'back2'],
        'time_out'   => ['time_out', 'done'],
    ];
    $type = str($data['type'] ?? '', 20);
    if (!isset($map[$type])) respond(['ok' => false, 'error' => 'Unknown punch type']);
    $uid = str($data['user_id'] ?? '', 40);
    if ($uid === '') respond(['ok' => false, 'error' => 'Missing user_id']);

    $ts = dtOrNull($data['ts'] ?? null) ?: date('Y-m-d H:i:s');
    $workDate = substr($ts, 0, 10);
    [$field, $status] = $map[$type];
    $now = date('Y-m-d H:i:s');
    $name = str($data['name'] ?? '', 150);
    $username = str($data['username'] ?? '', 100);
    $role = str($data['role'] ?? '', 30);

    try {
        $pdo->beginTransaction();
        $found = rowsFor('SELECT * FROM attendance WHERE user_id = ? AND work_date = ? FOR UPDATE', [$uid, $workDate]);
        if ($found) {
            $row = $found[0];
            if (!empty($row[$field])) {
                $pdo->rollBack();
                respond(['ok' => false, 'error' => 'Already punched: ' . strtoupper($type)]);
            }
            $stmt = $pdo->prepare("UPDATE attendance SET $field = ?, status = ?, updated_at = ?, name = ?, username = ?, role = ? WHERE id = ?");
            $stmt->execute([$ts, $status, $now, $name, $username, $role, $row['id']]);
            $id = $row['id'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO attendance (user_id, username, name, role, work_date, $field, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$uid, $username, $name, $role, $workDate, $ts, $status, $now]);
            $id = $pdo->lastInsertId();
        }
        $pdo->commit();
        $row = rowsFor('SELECT * FROM attendance WHERE id = ?', [$id])[0];
        respond(['ok' => true, 'row' => $row]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['ok' => false, 'error' => $e->getMessage()]);
    }
}

respond(['ok' => false, 'error' => 'Unknown action']);
