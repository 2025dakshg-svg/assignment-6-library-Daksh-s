/**
 * Book + transaction routes.
 *
 * Book routes (/api/books):
 *   GET    /            - authenticated (list w/ filters)
 *   GET    /search      - authenticated (MUST be registered before /:id)
 *   GET    /:id         - authenticated
 *   POST   /            - librarian
 *   PUT    /:id         - librarian
 *   DELETE /:id         - librarian
 *   POST   /:id/borrow  - student
 *   POST   /:id/return  - student
 *
 * Transaction routes (/api/transactions):
 *   GET /        - librarian
 *   GET /my      - authenticated
 */

const router = require('express').Router();
const transactionRouter = require('express').Router();
const bookController = require('../controllers/bookController');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  validate,
  idRules,
  listBooksRules,
  searchRules,
  createBookRules,
  updateBookRules,
} = require('../middleware/validator');

/* ----------- Books ----------- */

// NOTE: /search must be declared before /:id so "search" is not captured as an id param.
router.get('/search', authenticate, searchRules, validate, bookController.searchBooks);

router.get('/', authenticate, listBooksRules, validate, bookController.listBooks);
router.get('/:id', authenticate, idRules, validate, bookController.getBook);

router.post('/', authenticate, requireRole('librarian'), createBookRules, validate, bookController.createBook);
router.put('/:id', authenticate, requireRole('librarian'), updateBookRules, validate, bookController.updateBook);
router.delete('/:id', authenticate, requireRole('librarian'), idRules, validate, bookController.deleteBook);

router.post('/:id/borrow', authenticate, requireRole('student'), idRules, validate, bookController.borrowBook);
router.post('/:id/return', authenticate, requireRole('student'), idRules, validate, bookController.returnBook);

/* ----------- Transactions ----------- */

transactionRouter.get('/', authenticate, requireRole('librarian'), bookController.getAllTransactions);
transactionRouter.get('/my', authenticate, bookController.getMyTransactions);

module.exports = { router, transactionRouter };