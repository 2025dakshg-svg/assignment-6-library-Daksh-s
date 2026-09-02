/**
 * User management routes - /api/users (all librarian-only).
 *   GET  /:id          - get single user
 *   PUT  /:id/role     - update a user's role
 *   DELETE /:id        - delete a user
 */

const router = require('express').Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate, updateRoleRules } = require('../middleware/validator');

router.get('/', authenticate, requireRole('librarian'), userController.getUsers);
router.get('/:id', authenticate, requireRole('librarian'), userController.getUser);
router.put('/:id/role', authenticate, requireRole('librarian'), updateRoleRules, validate, userController.updateRole);
router.delete('/:id', authenticate, requireRole('librarian'), userController.deleteUser);

module.exports = router;