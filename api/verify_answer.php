<?php
header('Content-Type: application/json');
require_once '../config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['question_id']) || !isset($data['user_answer'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT answer, difficulty FROM questions WHERE id = ?");
    $stmt->execute([$data['question_id']]);
    $question = $stmt->fetch();
    
    if (!$question) {
        http_response_code(404);
        echo json_encode(['error' => 'Question introuvable']);
        exit;
    }
    
    $isCorrect = ($data['user_answer'] === $question['answer']);
    
    $points = [
        'facile' => 1,
        'moyen' => 2,
        'difficile' => 3
    ];
    
    $basePoints = $points[$question['difficulty']];
    $earnedPoints = $isCorrect ? $basePoints : 0;
    
    echo json_encode([
        'success' => true,
        'correct' => $isCorrect,
        'correct_answer' => $question['answer'],
        'points' => $earnedPoints,
        'base_points' => $basePoints
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}