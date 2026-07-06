const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const rolesAllowed = require('../middleware/roles');
const reportController = require('../controllers/reportController');

router.get('/', ensureAuthenticated, rolesAllowed('administrador','cedis'), reportController.listar);

module.exports = router;