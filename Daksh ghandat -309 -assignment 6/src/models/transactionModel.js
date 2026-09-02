/**
 * Transaction model - Firestore "transactions" collection.
 *
 * Records every borrow / return action.
 * Document shape:
 * {
 *   transactionId: string,     // = document id
 *   userId: string,
 *   bookId: string,
 *   type: 'borrow' | 'return',
 *   borrowDate: Timestamp,
 *   returnDate: Timestamp,     // null while still borrowed
 *   dueDate: Timestamp,        // borrowDate + 14 days
 *   status: 'active' | 'returned' | 'overdue',
 *   createdAt: Timestamp
 * }
 */

const { db } = require('../config/firebase');

const transactionsCollection = () => db.collection('transactions');

/** Create a new transaction document with an auto-generated id. */
async function createTransaction(data) {
  const ref = transactionsCollection().doc();
  const record = {
    transactionId: ref.id,
    userId: data.userId,
    bookId: data.bookId,
    type: data.type,
    borrowDate: data.borrowDate || null,
    returnDate: data.returnDate || null,
    dueDate: data.dueDate || null,
    status: data.status || 'active',
    createdAt: new Date(),
  };
  await ref.set(record);
  return record;
}

/** Fetch a single transaction by id. Returns null if absent. */
async function getTransactionById(transactionId) {
  const doc = await transactionsCollection().doc(transactionId).get();
  if (!doc.exists) return null;
  return { transactionId: doc.id, ...doc.data() };
}

/** All transactions, most recently borrowed first. */
async function getAllTransactions() {
  const snapshot = await transactionsCollection().get();
  return snapshot.docs
    .map((doc) => ({ transactionId: doc.id, ...doc.data() }))
    .sort((a, b) => byNewestDesc(a.borrowDate, b.borrowDate));
}

/** All transactions for a given user, most recently borrowed first. */
async function getTransactionsByUser(userId) {
  const snapshot = await transactionsCollection()
    .where('userId', '==', userId)
    .get();
  return snapshot.docs
    .map((doc) => ({ transactionId: doc.id, ...doc.data() }))
    .sort((a, b) => byNewestDesc(a.borrowDate, b.borrowDate));
}

/**
 * Sort helper - newest-first comparator for Firestore Timestamp / Date values.
 * (In-memory sorting avoids composite-index requirements in fresh Firestore
 * projects, where `where(...) + orderBy(...)` would demand a manual index.)
 */
function byNewestDesc(valueA, valueB) {
  const timeA = valueA && typeof valueA.toMillis === 'function' ? valueA.toMillis() : new Date(valueA).getTime();
  const timeB = valueB && typeof valueB.toMillis === 'function' ? valueB.toMillis() : new Date(valueB).getTime();
  return (timeB || 0) - (timeA || 0);
}

/** The active (unreturned) borrow for a specific user + book, if any. */
async function getActiveTransaction(userId, bookId) {
  const snapshot = await transactionsCollection()
    .where('userId', '==', userId)
    .where('bookId', '==', bookId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { transactionId: doc.id, ...doc.data() };
}

/** Update fields on an existing transaction. */
async function updateTransaction(transactionId, updates) {
  await transactionsCollection().doc(transactionId).update({
    ...updates,
    updatedAt: new Date(),
  });
  return getTransactionById(transactionId);
}

module.exports = {
  createTransaction,
  getTransactionById,
  getAllTransactions,
  getTransactionsByUser,
  getActiveTransaction,
  updateTransaction,
};