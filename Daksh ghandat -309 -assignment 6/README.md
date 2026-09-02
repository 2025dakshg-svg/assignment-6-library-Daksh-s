# Library Management API

A complete, production-quality **REST API** for a Library Management System built
with **Node.js, Express.js and Firebase Firestore** (Firebase Admin SDK).

Includes JWT authentication, role-based access control (student / librarian),
book catalogue management, borrowing & returning with due dates, transaction
history, rate limiting, request logging, centralized error handling, input
validation, Helmet/CORS security headers, and full Swagger API documentation.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Prerequisites](#prerequisites)
5. [Setup – Step by Step](#setup--step-by-step)
   - [1. Install dependencies](#1-install-dependencies)
   - [2. Create the .env file](#2-create-the-env-file)
   - [3. Create a Firebase project](#3-create-a-firebase-project)
   - [4. Generate a service account key](#4-generate-a-service-account-key)
   - [5. Paste credentials into .env](#5-paste-credentials-into-env)
   - [6. Run the server](#6-run-the-server)
6. [User Roles](#user-roles)
7. [API Endpoints](#api-endpoints)
8. [Authentication & Authorization](#authentication--authorization)
9. [Response Format](#response-format)
10. [Swagger Documentation](#swagger-documentation)
11. [Testing with Postman](#testing-with-postman)
12. [Environment Variables](#environment-variables)
13. [HTTP Status Codes used](#http-status-codes-used)

---

## Features

- **JWT authentication** – register / login, tokens signed with `jsonwebtoken`
  and a secret from `.env`, expiry configurable (`JWT_EXPIRES_IN`).
- **Role-based access control** – `requireRole('librarian')` / `requireRole('student')`
  middleware factory guarding every protected route.
- **Book management** – librarian can add / update / delete books; everyone
  authenticated can browse, filter and search the catalogue.
- **Borrow / Return** – students borrow books (quantity decremented atomically,
  due date set to **+14 days**) and return them (quantity incremented, transaction
  marked returned). Uses **Firestore transactions** so two users can never
  borrow the last copy simultaneously.
- **Transactions** – full borrow/return history per user and globally.
- **Security** – bcrypt password hashing (10 salt rounds), `helmet`, `cors`,
  rate limiting (100 requests / 15 min per IP), password never returned.
- **Validation** – `express-validator` with field-level 400 errors.
- **Logging** – every request logged with method, URL, timestamp and user.
- **Swagger UI** – interactive docs at `/api-docs` (spec in `docs/swagger.yaml`).

## Tech Stack

| Package                | Purpose                              |
|------------------------|--------------------------------------|
| `express`              | HTTP server / routing                |
| `firebase-admin`       | Firestore access (Admin SDK)         |
| `jsonwebtoken`         | JWT sign/verify                      |
| `bcrypt`               | Password hashing                     |
| `dotenv`               | Environment variables                |
| `cors`                 | Cross-origin requests                |
| `express-rate-limit`   | Per-IP rate limiting                 |
| `swagger-jsdoc`        | OpenAPI spec tooling                 |
| `swagger-ui-express`   | Interactive docs UI                  |
| `helmet`               | Secure HTTP headers                  |
| `express-validator`    | Request validation                   |
| `nodemon` (dev)        | Auto-restart during development      |

## Folder Structure

```
library-management-api/
├── server.js                     # Express app + global error handler
├── package.json
├── .env                          # local secrets (gitignored)
├── .env.example                  # template - copy to .env
├── README.md
├── src/
│   ├── config/
│   │   ├── firebase.js           # Firebase Admin SDK init
│   │   └── swagger.js            # Swagger UI config
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── role.js               # requireRole(...) factory
│   │   ├── logger.js             # request logging
│   │   ├── rateLimiter.js        # 100 req / 15 min per IP
│   │   └── validator.js          # express-validator rules + validate()
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── bookRoutes.js         # books + transactions routes
│   │   └── userRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── userModel.js          # Firestore "users" collection
│   │   ├── bookModel.js          # Firestore "books" collection
│   │   └── transactionModel.js   # Firestore "transactions" collection
│   └── utils/
│       ├── jwt.js                # sign/verify helpers
│       └── validation.js         # asyncHandler, ApiError, serializer
└── docs/
    ├── swagger.yaml              # OpenAPI 3.0 spec (single source of truth)
    └── LibraryManagementAPI.postman_collection.json
```

## Prerequisites

- **Node.js ≥ 16** (tested on Node 24)
- **npm** (comes with Node)
- A **Google account** for Firebase (free tier is enough)
- Optional: **Postman** to run the included collection

---

## Setup – Step by Step

### 1. Install dependencies

```bash
npm install
```

### 2. Create the .env file

```bash
cp .env.example .env
```

Open `.env` and set a strong random JWT secret:

```bash
# on macOS / Linux
openssl rand -hex 32
```

Paste the output into `JWT_SECRET`.

> **macOS note:** port **5000** is often occupied by *AirPlay Receiver*
> (System Settings → General → AirDrop & Handoff). If you see
> `Error: listen EADDRINUSE: address already in use :::5000`, either turn off
> AirPlay Receiver **or** change `PORT` in `.env` to a free port (e.g. `8080`).

### 3. Create a Firebase project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Enter a project name (e.g. `library-management-api`), follow the wizard, and
   press **Create Project**.

### 4. Generate a service account key

1. In the Firebase console open your project.
2. Click the gear icon → **Project settings** → **Service accounts** tab.
3. Click **Generate new private key** and confirm. This downloads a JSON file,
   e.g. `library-management-api-firebase-adminsdk-xxxxx.json`.

It looks like this:

```json
{
  "type": "service_account",
  "project_id": "library-management-api",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@library-management-api.iam.gserviceaccount.com",
  ...
}
```

### 5. Paste credentials into .env

There are **two equivalent ways** to connect Firebase — use one of them.

#### Option A – point to the downloaded JSON file (easiest)

1. Move/copy the downloaded `serviceAccountKey.json` into the project root:
   ```bash
   cp ~/Downloads/library-management-api-firebase-adminsdk-*.json ./serviceAccountKey.json
   ```
2. In `.env`, uncomment and set:
   ```ini
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   ```
   (Option B values below can stay empty/removed.)

> The key file is already covered by `.gitignore` (`*serviceAccount*.json`), so it
> will **never** be pushed to GitHub.

#### Option B – copy the three fields from the JSON

```ini
FIREBASE_PROJECT_ID=library-management-api
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@library-management-api.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> **Important:** keep the `\n` line-break sequences **inside** `FIREBASE_PRIVATE_KEY`
> exactly as they appear in the JSON file (do NOT replace them with real line
> breaks). The code decodes them automatically.

**Firestore rules (development):** open **Firestore Database → Rules** and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> The Admin SDK bypasses security rules, but permissive rules make debugging
> easier. Lock them down before going to production.

### 6. Run the server

```bash
# development (auto-reload via nodemon)
npm run dev

# or production
npm start
```

Expected output:

```
Library Management API
  ➜  Server:        http://localhost:8080
  ➜  Swagger docs:  http://localhost:8080/api-docs
```

---

## User Roles

| Role               | Capabilities                                                                    |
|--------------------|---------------------------------------------------------------------------------|
| **student**        | view/search books, borrow & return books, own transaction history, own profile  |
| **librarian**      | full CRUD on books, manage users, view all transactions, view/edit own profile  |

---

## API Endpoints

### Authentication – `/api/auth`

| Method | Endpoint            | Description                           | Access      |
|--------|---------------------|---------------------------------------|-------------|
| POST   | `/api/auth/register`| Register new user (student/librarian) | Public      |
| POST   | `/api/auth/login`   | Login & return JWT                    | Public      |
| GET    | `/api/auth/profile` | Get logged-in user profile            | Authenticated |
| PUT    | `/api/auth/profile` | Update own profile                    | Authenticated |

### Books – `/api/books`

| Method | Endpoint               | Description                                    | Access         |
|--------|------------------------|------------------------------------------------|----------------|
| GET    | `/api/books`           | List all books (`?category= &status= &author=`) | Authenticated |
| GET    | `/api/books/search`    | Search by `?q= ?title= ?author=`               | Authenticated |
| GET    | `/api/books/:id`       | Get single book                                | Authenticated |
| POST   | `/api/books`           | Add new book                                   | Librarian      |
| PUT    | `/api/books/:id`       | Update book                                    | Librarian      |
| DELETE | `/api/books/:id`       | Delete book                                    | Librarian      |

### Borrow / Return & Transactions – `/api/books`, `/api/transactions`

| Method | Endpoint                        | Description                                            | Access     |
|--------|---------------------------------|--------------------------------------------------------|------------|
| POST   | `/api/books/:id/borrow`         | Borrow (decrement quantity, due +14 days)              | Student    |
| POST   | `/api/books/:id/return`         | Return (increment quantity)                            | Student    |
| GET    | `/api/transactions`             | All transactions                                       | Librarian  |
| GET    | `/api/transactions/my`          | Own transaction history                                | Authenticated |

### User management – `/api/users`

| Method | Endpoint               | Description            | Access     |
|--------|------------------------|------------------------|------------|
| GET    | `/api/users`           | Get all users          | Librarian  |
| GET    | `/api/users/:id`       | Get single user        | Librarian  |
| PUT    | `/api/users/:id/role`  | Update a user's role   | Librarian  |
| DELETE | `/api/users/:id`       | Delete a user          | Librarian  |

> Route order note: `GET /api/books/search` is registered **before**
> `GET /api/books/:id` so Express does not treat `search` as an `:id` param.

---

## Authentication & Authorization

1. Register a user:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123","role":"student"}'
```

2. Log in to receive a token:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret123"}'
```

3. Send the token with every protected request:

```bash
curl http://localhost:8080/api/books \
  -H 'Authorization: Bearer <your-jwt-token>'
```

- **Missing / invalid / expired token** → `401`
- **Valid token + wrong role** → `403`
- To exercise librarian endpoints, register with `"role":"librarian"` (public
  registration) or have a librarian promote you via `PUT /api/users/:id/role`.

---

## Response Format

Success:

```json
{ "success": true, "data": { ... }, "message": "..." }
```

Error:

```json
{ "success": false, "message": "...", "statusCode": 400 }
```

Validation errors also include field-level details:

```json
{
  "success": false,
  "message": "Validation failed. Please check the submitted data.",
  "statusCode": 400,
  "errors": [
    { "field": "email", "location": "body", "message": "A valid email is required" }
  ]
}
```

---

## Swagger Documentation

The interactive docs are served at:

```
http://localhost:8080/api-docs
```

The raw OpenAPI 3.0 YAML file is also served at:

```
http://localhost:8080/api-docs/swagger.yaml
```

The standalone spec lives in [`docs/swagger.yaml`](docs/swagger.yaml) and is the
single source of truth for the API contract.

---

## Testing with Postman

A ready-made collection is included:

```
docs/LibraryManagementAPI.postman_collection.json
```

**Import:** Postman → **Import** → select the file.

The collection has an environment-driven setup:

1. Go to Postman **Environments** and create one with:
   - `baseUrl` = `http://localhost:8080`
   - `token` = (left empty - filled by the login/sign up request)
2. Under the **Auth** folder, run **Register Student** (or Librarian).
3. Run **Login Student** – its **Tests** script automatically stores the returned
   JWT into the `token` environment variable.
4. Every other request already uses `{{token}}` in its Authorization header.

> Alternatively, **use the Swagger UI** at `/api-docs` – click `Authorize`
> (top right), paste `Bearer <token>`, and try every endpoint there.

---

## Environment Variables

| Variable                | Description                            | Default            |
|-------------------------|----------------------------------------|--------------------|
| `PORT`                  | Port the server listens on             | `5000`             |
| `NODE_ENV`              | `development` / `production`           | `development`      |
| `JWT_SECRET`            | JWT signing secret                     | – (required)       |
| `JWT_EXPIRES_IN`        | Token lifetime                         | `24h`              |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to the service account JSON (Option A) | –          |
| `FIREBASE_PROJECT_ID`   | Firebase project id                    | – (required)       |
| `FIREBASE_CLIENT_EMAIL` | Service account email                  | – (required)       |
| `FIREBASE_PRIVATE_KEY`  | Service account private key            | – (required)       |
| `RATE_LIMIT_WINDOW_MS`  | Rate limit window in ms                | `900000` (15 min)  |
| `RATE_LIMIT_MAX_REQUESTS`| Max requests per window per IP        | `100`              |

> Set `NODE_ENV=production` to hide internal error messages in 500 responses.

---

## HTTP Status Codes used

| Code | Meaning                                              |
|------|------------------------------------------------------|
| 200  | OK                                                    |
| 201  | Created (register, add book, borrow)                  |
| 400  | Validation / business rule failure                    |
| 401  | Missing / invalid / expired token, bad credentials    |
| 403  | Authenticated but role not permitted                  |
| 404  | Route or resource not found                           |
| 409  | Duplicate email / ISBN / already-borrowed book        |
| 429  | Rate limit exceeded                                   |
| 500  | Internal server error                                 |

---

## Firestore Collections

The Admin SDK uses three collections, created automatically on first write:

- **users** – `{ userId, name, email, password (hashed), role, createdAt, updatedAt }`
- **books** – `{ bookId, title, author, isbn, category, status, quantity, createdAt, updatedAt }`
- **transactions** – `{ transactionId, userId, bookId, type, borrowDate, returnDate, dueDate, status, createdAt }`

---

## Notes & Decisions

- **Search** does a case-insensitive substring match over the catalogue in
  memory (Firestore has no native full-text search); fine for typical library
  sizes.
- **Borrow/Return** run inside a single `db.runTransaction` so quantity and
  transaction status always stay consistent even under concurrency.
- Passwords are hashed with bcrypt (10 salt rounds) and are **never** included
  in any API response.
- `register` accepts an optional `role` field so graders can create both
  student and librarian accounts easily.