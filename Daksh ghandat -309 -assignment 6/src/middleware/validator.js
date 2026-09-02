/**
 * Input validation middleware
 * ---------------------------
 * Express-validator rule chains for every route + the `validate` middleware
 * that turns a failed validation object into a 400 JSON response with
 * field-level error details.
 *
 * Rules are grouped so routes can attach only what they need:
 *   router.post('/register', registerRules, validate, controller)
 *
 * `.bail()` stops the chain after the FIRST failed check on a field so the
 * response contains one clean error per field instead of duplicates.
 */

const { body, param, query, validationResult } = require('express-validator');

const ROLES = ['student', 'librarian'];
const BOOK_STATUS = ['available', 'borrowed'];

/* ---------------- Auth rules ---------------- */

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required').bail()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .isEmail().withMessage('A valid email is required').bail()
    .trim().toLowerCase(),
  body('password')
    .isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters'),
  body('role')
    .optional()
    .isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

const loginRules = [
  body('email')
    .isEmail().withMessage('A valid email is required').bail()
    .trim().toLowerCase(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const updateProfileRules = [
  body('name')
    .optional()
    .isString().withMessage('Name must be a string').bail()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('A valid email is required').bail()
    .trim().toLowerCase(),
  body('password')
    .optional()
    .isString().withMessage('Password must be a string').bail()
    .isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters'),
];

/* ---------------- Book rules ---------------- */

const createBookRules = [
  body('title')
    .trim().notEmpty().withMessage('Title is required').bail()
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('author')
    .trim().notEmpty().withMessage('Author is required').bail()
    .isLength({ max: 200 }).withMessage('Author must be at most 200 characters'),
  body('isbn')
    .trim().notEmpty().withMessage('ISBN is required').bail()
    .isLength({ min: 10, max: 17 }).withMessage('ISBN must be 10-17 characters'),
  body('category')
    .trim().notEmpty().withMessage('Category is required').bail()
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),
  body('status')
    .optional()
    .isIn(BOOK_STATUS).withMessage(`Status must be one of: ${BOOK_STATUS.join(', ')}`),
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer').bail()
    .toInt(),
];

const updateBookRules = [
  body('title')
    .optional()
    .isString().withMessage('Title must be a string').bail()
    .trim().notEmpty().withMessage('Title cannot be empty').bail()
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('author')
    .optional()
    .isString().withMessage('Author must be a string').bail()
    .trim().notEmpty().withMessage('Author cannot be empty').bail()
    .isLength({ max: 200 }).withMessage('Author must be at most 200 characters'),
  body('isbn')
    .optional()
    .isString().withMessage('ISBN must be a string').bail()
    .trim().notEmpty().withMessage('ISBN cannot be empty').bail()
    .isLength({ min: 10, max: 17 }).withMessage('ISBN must be 10-17 characters'),
  body('category')
    .optional()
    .isString().withMessage('Category must be a string').bail()
    .trim().notEmpty().withMessage('Category cannot be empty').bail()
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),
  body('status')
    .optional()
    .isIn(BOOK_STATUS).withMessage(`Status must be one of: ${BOOK_STATUS.join(', ')}`),
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer').bail()
    .toInt(),
];

/* ---------------- Query + param rules ---------------- */

const listBooksRules = [
  query('category').optional().trim().notEmpty().withMessage('category filter cannot be empty'),
  query('status').optional().isIn(BOOK_STATUS).withMessage(`Status must be one of: ${BOOK_STATUS.join(', ')}`),
  query('author').optional().trim().notEmpty().withMessage('author filter cannot be empty'),
];

const searchRules = [
  query('q').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Search term q must be 1-200 characters'),
  query('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('title must be 1-200 characters'),
  query('author').optional().trim().isLength({ min: 1, max: 200 }).withMessage('author must be 1-200 characters'),
];

const idRules = [
  param('id').isString().withMessage('A valid resource id is required').bail().trim().notEmpty().withMessage('A valid resource id is required'),
];

/* ---------------- User management rules ---------------- */

const updateRoleRules = [
  body('role')
    .isIn(ROLES).withMessage(`Role is required and must be one of: ${ROLES.join(', ')}`),
];

/**
 * Validation result-checker middleware. Runs `validationResult(req)`, and if
 * errors exist responds 400 with field-level details, otherwise calls next().
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((error) => ({
    field: error.path,
    location: error.location,
    message: error.msg,
  }));

  return res.status(400).json({
    success: false,
    message: 'Validation failed. Please check the submitted data.',
    statusCode: 400,
    errors,
  });
}

module.exports = {
  validate,
  registerRules,
  loginRules,
  updateProfileRules,
  createBookRules,
  updateBookRules,
  listBooksRules,
  searchRules,
  idRules,
  updateRoleRules,
};