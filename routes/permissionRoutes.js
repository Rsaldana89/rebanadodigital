const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const permissionController = require('../controllers/permissionController');

router.get('/', ensureAuthenticated, requirePermission('permissions.manage'), permissionController.index);
router.post('/roles', ensureAuthenticated, requirePermission('permissions.manage'), permissionController.updateRoles);
router.get('/usuario/:id', ensureAuthenticated, requirePermission('permissions.manage'), permissionController.userForm);
router.post('/usuario/:id', ensureAuthenticated, requirePermission('permissions.manage'), permissionController.updateUser);

module.exports = router;
