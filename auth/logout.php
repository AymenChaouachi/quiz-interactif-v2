<?php
require_once '../config.php';
header('Content-Type: application/json');

// Détruire la session
session_unset();
session_destroy();

echo json_encode([
    'success' => true,
    'message' => 'Déconnexion réussie'
]);