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
if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

$username = trim($data['username']);
$email = trim($data['email']);
$password = $data['password'];

// Validation des champs
if (strlen($username) < 3) {
    http_response_code(400);
    echo json_encode(['error' => 'Le nom d\'utilisateur doit contenir au moins 3 caractères']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email invalide']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Le mot de passe doit contenir au moins 6 caractères']);
    exit;
}

try {
    // Vérifier si l'utilisateur existe déjà
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Nom d\'utilisateur ou email déjà utilisé']);
        exit;
    }
    
    // Créer l'utilisateur
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$username, $email, $passwordHash]);
    
    $userId = $pdo->lastInsertId();
    
    // Connecter automatiquement l'utilisateur
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    
    echo json_encode([
        'success' => true,
        'message' => 'Inscription réussie',
        'user' => [
            'id' => $userId,
            'username' => $username,
            'email' => $email
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de l\'inscription: ' . $e->getMessage()]);
}