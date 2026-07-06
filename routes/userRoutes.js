const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const rolesAllowed = require('../middleware/roles');
const userController = require('../controllers/userController');

// Listado de usuarios
router.get('/', ensureAuthenticated, rolesAllowed('administrador'), userController.listar);

// Crear usuario
router.get('/crear', ensureAuthenticated, rolesAllowed('administrador'), userController.showCrear);
router.post('/crear', ensureAuthenticated, rolesAllowed('administrador'), userController.crear);

// Editar usuario
router.get('/:id/editar', ensureAuthenticated, rolesAllowed('administrador'), userController.showEditar);
router.post('/:id', ensureAuthenticated, rolesAllowed('administrador'), userController.editar);

module.exports = router;