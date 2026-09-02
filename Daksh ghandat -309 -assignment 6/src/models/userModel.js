/**
 * User model - Firestore "users" collection.
 *
 * Document shape:
 * {
 *   userId: string,        // = document id
 *   name: string,
 *   email: string (unique),
 *   password: string,      // bcrypt-hashed, never returned to clients
 *   role: 'student' | 'librarian',
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

const { db } = require('../config/firebase');

const usersCollection = () => db.collection('users');

/** Strip sensitive fields before returning a user to the client. */
function toPublicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

/** Fetch a single user by document id. Returns null if it does not exist. */
async function getUserById(userId) {
  const doc = await usersCollection().doc(userId).get();
  if (!doc.exists) return null;
  return { userId: doc.id, ...doc.data() };
}

/** Fetch a single user by email (case-insensitive). Returns null if absent. */
async function getUserByEmail(email) {
  const normalized = String(email).toLowerCase().trim();
  const snapshot = await usersCollection()
    .where('email', '==', normalized)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { userId: doc.id, ...doc.data() };
}

/** Create a new user document with an auto-generated id. */
async function createUser(data) {
  const ref = usersCollection().doc();
  const now = new Date();
  const user = {
    userId: ref.id,
    name: data.name,
    email: String(data.email).toLowerCase().trim(),
    password: data.password,
    role: data.role || 'student',
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(user);
  return user;
}

/**
 * Audit-safe email update. If `email` is about to change, clones the document
 * under a new id (emails act as the unique login key).
 */
async function updateUserEmail(currentId, nextEmail) {
  const current = await getUserById(currentId);
  if (!current) return null;
  const conflict = await getUserByEmail(nextEmail);
  if (conflict && conflict.userId !== currentId) return 'conflict';

  const normalized = nextEmail.toLowerCase().trim();
  if (normalized === current.email) return current;

  await usersCollection().doc(currentId).delete();
  const newRef = usersCollection().doc();
  await usersCollection()
    .doc(newRef.id)
    .set({
      ...current,
      userId: newRef.id,
      email: normalized,
      updatedAt: new Date(),
    });
  return { ...current, ...{ userId: newRef.id, email: normalized, updatedAt: new Date() } };
}

/**
 * Update allowed profile fields on an existing user.
 * `updates` may contain: name, password (pre-hashed), email.
 */
async function updateUser(userId, updates) {
  const allowed = ['name', 'password', 'email'];
  const patch = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined && updates[key] !== null) patch[key] = updates[key];
  });
  if (Object.keys(patch).length === 0) return getUserById(userId);

  patch.updatedAt = new Date();
  await usersCollection().doc(userId).update(patch);
  return getUserById(userId);
}

/** Update only the role of a user. */
async function updateRole(userId, role) {
  await usersCollection()
    .doc(userId)
    .update({ role, updatedAt: new Date() });
  return getUserById(userId);
}

/** Return every user, newest first. */
async function getAllUsers() {
  const snapshot = await usersCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ userId: doc.id, ...doc.data() }));
}

/** Permanently delete a user document. */
async function deleteUser(userId) {
  await usersCollection().doc(userId).delete();
  return userId;
}

module.exports = {
  toPublicUser,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  updateUserEmail,
  updateRole,
  getAllUsers,
  deleteUser,
};