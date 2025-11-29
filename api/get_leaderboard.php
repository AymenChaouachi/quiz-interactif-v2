<?php
header('Content-Type: application/json');
require_once '../config.php';

try {
    $stmt = $pdo->query("
        SELECT u.username, s.score, s.max_score, s.bonus_score, s.percentage, s.completed_at
        FROM scores s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.percentage DESC, s.score DESC
        LIMIT 10
    ");
    
    $leaderboard = $stmt->fetchAll();
    
    $userScores = [];
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare("
            SELECT score, max_score, bonus_score, percentage, completed_at
            FROM scores
            WHERE user_id = ?
            ORDER BY percentage DESC, score DESC
            LIMIT 5
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $userScores = $stmt->fetchAll();
    }
    
    echo json_encode([
        'success' => true,
        'global_leaderboard' => $leaderboard,
        'user_scores' => $userScores
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}