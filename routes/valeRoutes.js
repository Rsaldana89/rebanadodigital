const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const rolesAllowed = require('../middleware/roles');
const valeController = require('../controllers/valeController');

// Tablero de vales (rebanado y administradores)
router.get('/tablero', ensureAuthenticated, rolesAllowed('rebanado','administrador','cedis'), valeController.tablero);

// Crear vale
router.get('/crear', ensureAuthenticated, rolesAllowed('administrador','cedis'), valeController.showCrearForm);
router.post('/crear', ensureAuthenticated, rolesAllowed('administrador','cedis'), valeController.crearVale);

// Cambiar estado de un vale
router.post('/:id/estado', ensureAuthenticated, rolesAllowed('administrador','rebanado','cedis'), valeController.cambiarEstado);

// Detalle de vale
router.get('/:id', ensureAuthenticated, rolesAllowed('administrador','rebanado','cedis'), valeController.detalle);

module.exports = router;