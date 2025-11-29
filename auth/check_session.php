<?php
require_once '../config.php';
header('Content-Type: application/json');

if (isset($_SESSION['user_id'])) {
    $stmt = $pdo->prepare("SELECT id, username, email FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if ($user) {
        echo json_encode([
            'logged_in' => true,
            'user' => $user
        ]);
    } else {
        echo json_encode(['logged_in' => false]);
    }
} else {
    echo json_encode(['logged_in' => false]);
}
