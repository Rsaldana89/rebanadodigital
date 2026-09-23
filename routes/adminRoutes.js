const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const rolesAllowed = require('../middleware/roles');
const adminController = require('../controllers/adminController');

router.get('/respaldo-base-datos', ensureAuthenticated, rolesAllowed('administrador'), adminController.downloadDatabaseBackup);

module.exports = router;
