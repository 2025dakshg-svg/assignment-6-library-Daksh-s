/**
 * Auth routes - /api/auth
 *   POST /register  - public
 *   POST /login     - public
 *   GET  /profile   - authenticated
 *   PUT  /profile   - authenticated
 */

const router = require('express').Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const { validate, registerRules, loginRules, updateProfileRules } = require('../middleware/validator');

router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, updateProfileRules, validate, authController.updateProfile);

module.exports = router;