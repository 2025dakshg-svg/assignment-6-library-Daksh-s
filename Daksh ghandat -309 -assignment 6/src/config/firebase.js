/**
 * Firebase Admin SDK - Firestore connection
 * -----------------------------------------
 * Initializes the Firebase Admin SDK using service-account credentials loaded
 * from environment variables (never hardcoded).
 *
 * Two supported ways to provide the service account (pick ONE):
 *
 *   Option A - path to the downloaded service-account JSON file:
 *     FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 *
 *   Option B - the three individual fields copied from the JSON:
 *     FIREBASE_PROJECT_ID=...
 *     FIREBASE_CLIENT_EMAIL=...
 *     FIREBASE_PRIVATE_KEY=...
 *
 * Note: `firebase-admin` is intentionally NOT initialized with hardcoded
 * credentials. If no credentials are configured the app still boots so the
 * API can be exercised (auth/validation/role checks), but Firestore calls will
 * fail with a clear error until .env is configured.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let options = { projectId: process.env.FIREBASE_PROJECT_ID || 'library-management-api' };
let hasCredentials = false;

/* ---------- Option A: service account JSON file ---------- */
function credentialsFromJsonFile(envValue) {
  const filePath = path.isAbsolute(envValue)
    ? envValue
    : path.resolve(PROJECT_ROOT, envValue);

  if (!fs.existsSync(filePath)) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      `[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH points to "${filePath}", ` +
        'but that file does not exist. Double-check the path.'
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      projectId: serviceAccount.project_id,
      credential: admin.credential.cert(serviceAccount),
    };
  } catch (error) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      `[Firebase] Could not read service account JSON at "${filePath}": ${error.message}`
    );
    return null;
  }
}

/* ---------- Option B: individual env vars ---------- */
function credentialsFromEnv() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }
  // Firestore requires the private key with real newlines. The key is stored
  // in .env with escaped \n sequences, so we decode them here.
  return {
    projectId: FIREBASE_PROJECT_ID,
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  };
}

// Try Option A first, then Option B.
const jsonCreds = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? credentialsFromJsonFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : null;
const envCreds = jsonCreds || credentialsFromEnv();
if (envCreds) {
  options = envCreds;
  hasCredentials = true;
}

if (!hasCredentials && process.env.NODE_ENV !== 'production') {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '[Firebase] WARNING: no credentials found in .env. Set either ' +
      'FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL ' +
      '+ FIREBASE_PRIVATE_KEY. Firestore operations will fail until you do (see README.md).'
  );
}

// Guard against double initialization (e.g. hot reloads / multiple requires).
if (!admin.apps.length) {
  admin.initializeApp(options);
}

/** Firestore database reference */
const db = admin.firestore();

/** Firebase Timestamp helpers */
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;
const serverTimestamp = () => FieldValue.serverTimestamp();
const nowTimestamp = () => Timestamp.now();

module.exports = { admin, db, Timestamp, FieldValue, serverTimestamp, nowTimestamp };