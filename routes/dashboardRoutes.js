const express = require('express');
const router = express.Router();
const { index } = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, index);

module.exports = router;