<?php
require_once '../config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

// Validation
if (!isset($data['username']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

try {
    // Rechercher l'utilisateur
    $stmt = $pdo->prepare("SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Identifiants incorrects']);
        exit;
    }
    
    // Connecter l'utilisateur
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Connexion réussie',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email']
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la connexion: ' . $e->getMessage()]);
}