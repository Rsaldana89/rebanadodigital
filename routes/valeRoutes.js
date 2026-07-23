const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const valeController = require('../controllers/valeController');

router.get('/tablero', ensureAuthenticated, requirePermission('vales.view'), valeController.tablero);
router.get('/crear', ensureAuthenticated, requirePermission('vales.create'), valeController.showCrearForm);
router.post('/crear', ensureAuthenticated, requirePermission('vales.create'), valeController.crearVale);
router.get('/:id/editar', ensureAuthenticated, requirePermission('vales.edit'), valeController.showEditarForm);
router.post('/:id/editar', ensureAuthenticated, requirePermission('vales.edit'), valeController.editarVale);
router.post('/:id/estado', ensureAuthenticated, requirePermission('vales.view'), valeController.cambiarEstado);
router.get('/:id', ensureAuthenticated, requirePermission('vales.view'), valeController.detalle);

module.exports = router;
