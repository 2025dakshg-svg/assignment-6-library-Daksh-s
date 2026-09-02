/**
 * Book controller - book CRUD, borrowing/returning, transactions.
 */

const bookModel = require('../models/bookModel');
const transactionModel = require('../models/transactionModel');
const { db } = require('../config/firebase');
const { asyncHandler, ApiError, serialize } = require('../utils/validation');

const BORROW_DURATION_DAYS = 14;

/* ------------------------------------------------------------------ */
/*  Book CRUD                                                          */
/* ------------------------------------------------------------------ */

/**
 * GET /api/books?category=&status=&author=
 * Authenticated. List books with optional exact-match filters.
 */
exports.listBooks = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category,
    status: req.query.status,
    author: req.query.author,
  };
  const books = await bookModel.getAllBooks(filters);
  return res.json({
    success: true,
    message: `${books.length} book(s) returned`,
    data: { books: serialize(books) },
  });
});

/**
 * GET /api/books/search?q=&title=&author=
 * Authenticated. Case-insensitive search over title/author.
 */
exports.searchBooks = asyncHandler(async (req, res) => {
  const params = {
    q: req.query.q,
    title: req.query.title,
    author: req.query.author,
  };
  const books = await bookModel.searchBooks(params);
  return res.json({
    success: true,
    message: `${books.length} book(s) found`,
    data: { books: serialize(books) },
  });
});

/**
 * GET /api/books/:id
 * Authenticated. Fetch a single book.
 */
exports.getBook = asyncHandler(async (req, res) => {
  const book = await bookModel.getBookById(req.params.id);
  if (!book) {
    throw new ApiError('Book not found.', 404);
  }
  return res.json({
    success: true,
    message: 'Book fetched successfully',
    data: { book: serialize(book) },
  });
});

/**
 * POST /api/books
 * Librarian only. Add a new book to the catalogue.
 */
exports.createBook = asyncHandler(async (req, res) => {
  const { title, author, isbn, category, quantity, status } = req.body;

  const existing = await bookModel.getBookByISBN(isbn);
  if (existing) {
    throw new ApiError('A book with this ISBN already exists.', 409);
  }

  const book = await bookModel.createBook({
    title,
    author,
    isbn,
    category,
    quantity: quantity !== undefined ? quantity : 1,
    status,
  });

  return res.status(201).json({
    success: true,
    message: 'Book added successfully',
    data: { book: serialize(book) },
  });
});

/**
 * PUT /api/books/:id
 * Librarian only. Update any field of a book.
 */
exports.updateBook = asyncHandler(async (req, res) => {
  const book = await bookModel.getBookById(req.params.id);
  if (!book) {
    throw new ApiError('Book not found.', 404);
  }

  if (req.body.isbn && req.body.isbn !== book.isbn) {
    const existing = await bookModel.getBookByISBN(req.body.isbn);
    if (existing && existing.bookId !== book.bookId) {
      throw new ApiError('Another book already uses this ISBN.', 409);
    }
  }

  // If quantity drops to 0 the book cannot be borrowed anymore.
  const quantity = req.body.quantity !== undefined ? req.body.quantity : book.quantity;
  let status = req.body.status !== undefined ? req.body.status : book.status;
  if (Number(quantity) === 0 && status === 'available') {
    status = 'borrowed';
  }

  const updated = await bookModel.updateBook(req.params.id, { ...req.body, status, quantity });
  return res.json({
    success: true,
    message: 'Book updated successfully',
    data: { book: serialize(updated) },
  });
});

/**
 * DELETE /api/books/:id
 * Librarian only. Remove a book from the catalogue.
 */
exports.deleteBook = asyncHandler(async (req, res) => {
  const book = await bookModel.getBookById(req.params.id);
  if (!book) {
    throw new ApiError('Book not found.', 404);
  }
  await bookModel.deleteBook(req.params.id);
  return res.json({
    success: true,
    message: 'Book deleted successfully',
    data: { bookId: req.params.id },
  });
});

/* ------------------------------------------------------------------ */
/*  Borrow / Return (transactional)                                    */
/* ------------------------------------------------------------------ */

/**
 * POST /api/books/:id/borrow
 * Student only. Creates a borrow transaction atomically with the quantity
 * decrement, sets dueDate = borrowDate + 14 days.
 */
exports.borrowBook = asyncHandler(async (req, res) => {
  const { id: bookId } = req.params;
  const userId = req.user.userId;

  const result = await db.runTransaction(async (tx) => {
    const bookRef = db.collection('books').doc(bookId);
    const bookSnapshot = await tx.get(bookRef);
    if (!bookSnapshot.exists) {
      throw new ApiError('Book not found.', 404);
    }
    const book = bookSnapshot.data();

    // A student may only hold ONE active borrow per book.
    const activeSnapshot = await tx.get(
      db
        .collection('transactions')
        .where('userId', '==', userId)
        .where('bookId', '==', bookId)
        .where('status', '==', 'active')
        .limit(1)
    );
    if (!activeSnapshot.empty) {
      throw new ApiError('You already have an active borrow for this book.', 409);
    }

    if (Number(book.quantity) <= 0) {
      throw new ApiError('No copies of this book are currently available.', 400);
    }

    const newQuantity = Number(book.quantity) - 1;
    await tx.update(bookRef, {
      quantity: newQuantity,
      status: newQuantity === 0 ? 'borrowed' : book.status,
      updatedAt: new Date(),
    });

    const now = new Date();
    const dueDate = new Date(now.getTime() + BORROW_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const transactionRef = db.collection('transactions').doc();

    const transaction = {
      transactionId: transactionRef.id,
      userId,
      bookId,
      type: 'borrow',
      borrowDate: now,
      returnDate: null,
      dueDate,
      status: 'active',
      createdAt: now,
    };
    await tx.set(transactionRef, transaction);
    return transaction;
  });

  return res.status(201).json({
    success: true,
    message: `Book borrowed successfully. Due back in ${BORROW_DURATION_DAYS} days.`,
    data: { transaction: serialize(result) },
  });
});

/**
 * POST /api/books/:id/return
 * Student only. Closes the active borrow transaction atomically with the
 * quantity increment.
 */
exports.returnBook = asyncHandler(async (req, res) => {
  const { id: bookId } = req.params;
  const userId = req.user.userId;

  const result = await db.runTransaction(async (tx) => {
    const bookRef = db.collection('books').doc(bookId);
    const bookSnapshot = await tx.get(bookRef);
    if (!bookSnapshot.exists) {
      throw new ApiError('Book not found.', 404);
    }
    const book = bookSnapshot.data();

    const activeSnapshot = await tx.get(
      db
        .collection('transactions')
        .where('userId', '==', userId)
        .where('bookId', '==', bookId)
        .where('status', '==', 'active')
        .limit(1)
    );
    if (activeSnapshot.empty) {
      throw new ApiError('No active borrow found for this book to return.', 400);
    }

    const transactionRef = activeSnapshot.docs[0].ref;
    const now = new Date();

    await tx.update(transactionRef, {
      returnDate: now,
      status: 'returned',
      updatedAt: now,
    });

    const newQuantity = Number(book.quantity) + 1;
    await tx.update(bookRef, {
      quantity: newQuantity,
      status: 'available',
      updatedAt: now,
    });

    return {
      transactionId: transactionRef.id,
      bookId,
      userId,
      returnDate: now,
      status: 'returned',
      quantityNow: newQuantity,
    };
  });

  return res.json({
    success: true,
    message: 'Book returned successfully',
    data: { transaction: serialize(result) },
  });
});

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */

/**
 * GET /api/transactions
 * Librarian only. View every transaction across all users.
 */
exports.getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await transactionModel.getAllTransactions();
  return res.json({
    success: true,
    message: `${transactions.length} transaction(s) returned`,
    data: { transactions: serialize(transactions) },
  });
});

/**
 * GET /api/transactions/my
 * Authenticated. View the logged-in user's own transaction history.
 */
exports.getMyTransactions = asyncHandler(async (req, res) => {
  const transactions = await transactionModel.getTransactionsByUser(req.user.userId);
  return res.json({
    success: true,
    message: `${transactions.length} transaction(s) returned`,
    data: { transactions: serialize(transactions) },
  });
});