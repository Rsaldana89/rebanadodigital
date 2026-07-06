const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const rolesAllowed = require('../middleware/roles');
const inventarioController = require('../controllers/inventarioController');

router.get('/registro', ensureAuthenticated, rolesAllowed('rebanado','administrador'), inventarioController.showRegistro);
router.post('/registro', ensureAuthenticated, rolesAllowed('rebanado','administrador'), inventarioController.guardarRegistro);

module.exports = router;