<?php
header('Content-Type: application/json');
require_once '../config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Non authentifié']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['score']) || !isset($data['max_score']) || !isset($data['percentage'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO scores (user_id, score, max_score, bonus_score, percentage) 
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $_SESSION['user_id'],
        $data['score'],
        $data['max_score'],
        $data['bonus_score'] ?? 0,
        $data['percentage']
    ]);
    
    echo json_encode(['success' => true, 'score_id' => $pdo->lastInsertId()]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}