const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const inventarioController = require('../controllers/inventarioController');

router.get('/', ensureAuthenticated, requirePermission('inventario.view'), inventarioController.index);
router.get('/productos/buscar', ensureAuthenticated, inventarioController.buscarProductos);
router.post('/productos', ensureAuthenticated, requirePermission('productos.manage'), inventarioController.registrarProducto);
router.post('/carga', ensureAuthenticated, requirePermission('inventario.manage'), inventarioController.registrarCarga);
router.post('/merma', ensureAuthenticated, requirePermission('inventario.manage'), inventarioController.registrarMerma);
router.get('/cierre', ensureAuthenticated, requirePermission('inventario.cierre'), inventarioController.showCierre);
router.post('/cierre', ensureAuthenticated, requirePermission('inventario.cierre'), inventarioController.guardarCierre);
router.get('/registro', ensureAuthenticated, requirePermission('inventario.cierre'), inventarioController.showRegistro);

module.exports = router;

