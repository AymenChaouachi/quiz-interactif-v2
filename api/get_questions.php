<?php
header('Content-Type: application/json');
require_once '../config.php';

try {
    $stmt = $pdo->query("
        SELECT id, flag_image, type, country, difficulty, answer 
        FROM questions 
        ORDER BY RAND()
    ");
    $questions = $stmt->fetchAll();
    
    foreach ($questions as &$question) {
        if ($question['type'] === 'qcm') {
            $stmt = $pdo->prepare("
                SELECT option_text 
                FROM question_options 
                WHERE question_id = ? 
                ORDER BY RAND()
            ");
            $stmt->execute([$question['id']]);
            $question['options'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
    }
    
    echo json_encode(['success' => true, 'questions' => $questions]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}