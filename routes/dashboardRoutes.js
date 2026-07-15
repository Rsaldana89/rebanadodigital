const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { index } = require('../controllers/dashboardController');

router.get('/', ensureAuthenticated, requirePermission('dashboard.view'), index);

module.exports = router;
