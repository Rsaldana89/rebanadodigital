const express = require('express');
const router = express.Router();
const { showLogin, login, logout } = require('../controllers/authController');
const { forwardAuthenticated } = require('../middleware/auth');

// Ruta para mostrar formulario de login
router.get('/login', forwardAuthenticated, showLogin);

// Manejar inicio de sesión
router.post('/login', login);

// Cerrar sesión
router.get('/logout', logout);

module.exports = router;