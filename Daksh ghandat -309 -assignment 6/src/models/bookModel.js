/**
 * Book model - Firestore "books" collection.
 *
 * Document shape:
 * {
 *   bookId: string,          // = document id
 *   title: string,
 *   author: string,
 *   isbn: string,
 *   category: string,
 *   status: 'available' | 'borrowed',
 *   quantity: number,
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

const { db } = require('../config/firebase');

const booksCollection = () => db.collection('books');

/**
 * Sort helper - newest-first comparator for Firestore Timestamp / Date values.
 * (In-memory sorting avoids composite index requirements in a fresh Firestore
 * project, where `where(...) + orderBy(...)` would demand a manual index.)
 */
function byNewestDesc(valueA, valueB) {
  const timeA = valueA && typeof valueA.toMillis === 'function' ? valueA.toMillis() : new Date(valueA).getTime();
  const timeB = valueB && typeof valueB.toMillis === 'function' ? valueB.toMillis() : new Date(valueB).getTime();
  return (timeB || 0) - (timeA || 0);
}

/** Fetch a single book by id. Returns null if absent. */
async function getBookById(bookId) {
  const doc = await booksCollection().doc(bookId).get();
  if (!doc.exists) return null;
  return { bookId: doc.id, ...doc.data() };
}

/** Fetch a single book by ISBN. Returns null if absent. */
async function getBookByISBN(isbn) {
  const snapshot = await booksCollection()
    .where('isbn', '==', isbn)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { bookId: doc.id, ...doc.data() };
}

/**
 * Return all books, optionally filtered by `category`, `status` or `author`
 * (exact match on each provided filter). Results are sorted newest-first in
 * memory (no composite-index requirement).
 */
async function getAllBooks(filters = {}) {
  let query = booksCollection();
  if (filters.category) query = query.where('category', '==', filters.category);
  if (filters.status) query = query.where('status', '==', filters.status);
  if (filters.author) query = query.where('author', '==', filters.author);

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => ({ bookId: doc.id, ...doc.data() }))
    .sort((a, b) => byNewestDesc(a.createdAt, b.createdAt));
}

/**
 * Search books by `q`, `title` and/or `author`.
 * Firestore does not support true full-text search, so we fetch the (filtered)
 * collection and apply a case-insensitive substring match in memory. This keeps
 * behaviour predictable for small-to-medium libraries.
 */
async function searchBooks(params = {}) {
  const { q, title, author } = params;
  const term = (q || '').toLowerCase().trim();
  const titleFilter = (title || '').toLowerCase().trim();
  const authorFilter = (author || '').toLowerCase().trim();

  const snapshot = await booksCollection().get();
  let results = snapshot.docs.map((doc) => ({ bookId: doc.id, ...doc.data() }));

  if (term) {
    results = results.filter(
      (book) =>
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term)
    );
  }
  if (titleFilter) {
    results = results.filter((book) =>
      book.title.toLowerCase().includes(titleFilter)
    );
  }
  if (authorFilter) {
    results = results.filter((book) =>
      book.author.toLowerCase().includes(authorFilter)
    );
  }
  return results;
}

/** Create a new book document with an auto-generated id. */
async function createBook(data) {
  const ref = booksCollection().doc();
  const now = new Date();
  const book = {
    bookId: ref.id,
    title: data.title,
    author: data.author,
    isbn: data.isbn,
    category: data.category,
    status: data.status || (data.quantity > 0 ? 'available' : 'borrowed'),
    quantity: Number(data.quantity) || 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(book);
  return book;
}

/** Update allowed fields on an existing book. */
async function updateBook(bookId, updates) {
  const allowed = ['title', 'author', 'isbn', 'category', 'status', 'quantity'];
  const patch = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) patch[key] = updates[key];
  });
  if (Object.keys(patch).length === 0) return getBookById(bookId);

  patch.updatedAt = new Date();
  await booksCollection().doc(bookId).update(patch);
  return getBookById(bookId);
}

/** Permanently delete a book document. */
async function deleteBook(bookId) {
  await booksCollection().doc(bookId).delete();
  return bookId;
}

module.exports = {
  getBookById,
  getBookByISBN,
  getAllBooks,
  searchBooks,
  createBook,
  updateBook,
  deleteBook,
};