const express = require('express');
const requireSyncToken = require('../middleware/syncToken');
const integrationController = require('../controllers/integrationController');

const router = express.Router();
router.use(requireSyncToken);
router.post('/', integrationController.receiveOrders);
router.post('/heartbeat', integrationController.heartbeat);
router.get('/status', integrationController.status);
router.get('/runs', integrationController.runs);

module.exports = router;
