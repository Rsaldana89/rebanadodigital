const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const reportController = require('../controllers/reportController');

router.get('/', ensureAuthenticated, requirePermission('reportes.view'), reportController.listar);

module.exports = router;
