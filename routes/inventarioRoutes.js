const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const inventarioController = require('../controllers/inventarioController');

router.get('/registro', ensureAuthenticated, requirePermission('inventario.manage'), inventarioController.showRegistro);
router.post('/registro', ensureAuthenticated, requirePermission('inventario.manage'), inventarioController.guardarRegistro);

module.exports = router;
