const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const userController = require('../controllers/userController');

router.get('/', ensureAuthenticated, requirePermission('users.manage'), userController.listar);
router.get('/crear', ensureAuthenticated, requirePermission('users.manage'), userController.showCrear);
router.post('/crear', ensureAuthenticated, requirePermission('users.manage'), userController.crear);
router.get('/:id/editar', ensureAuthenticated, requirePermission('users.manage'), userController.showEditar);
router.post('/:id/editar', ensureAuthenticated, requirePermission('users.manage'), userController.editar);

module.exports = router;
