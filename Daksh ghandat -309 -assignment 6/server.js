/**
 * Library Management API - server entry point.
 *
 * Wire-up order:
 *   1. Global middleware (helmet, cors, json, logger, rate limiter)
 *   2. Swagger UI at /api-docs
 *   3. Route modules
 *   4. 404 catch-all
 *   5. Global error handler (4-arg signature)
 */

const path = require('path');
// Load .env relative to this file so the server works regardless of cwd.
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');

const { swaggerUi, swaggerDocument, yamlPath } = require('./src/config/swagger');
const logger = require('./src/middleware/logger');
const rateLimiter = require('./src/middleware/rateLimiter');
const { ApiError } = require('./src/utils/validation');

const authRoutes = require('./src/routes/authRoutes');
const { router: bookRoutes, transactionRouter } = require('./src/routes/bookRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();

/* ---------------- Global middleware ---------------- */
app.use(helmet());                       // secure HTTP headers
app.use(cors());                         // cross-origin resource sharing
app.use(express.json({ limit: '10kb' })); // JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(logger);                         // request logging
app.use('/api', rateLimiter);            // 100 req / 15 min per IP

/* ---------------- API info ---------------- */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Library Management API is running',
    data: {
      health: 'ok',
      docs: '/api-docs',
      time: new Date().toISOString(),
    },
  });
});

/* ---------------- Swagger UI ---------------- */
app.get('/api-docs/swagger.yaml', (req, res) => res.type('yaml').send(fs.readFileSync(yamlPath, 'utf8')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  swaggerOptions: { displayRequestDuration: true, persistAuthorization: true },
}));

/* ---------------- Routes ---------------- */
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRouter);
app.use('/api/users', userRoutes);

/* ---------------- 404 catch-all ---------------- */
app.use((req, res, next) => {
  next(new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

/* ---------------- Global error handler ---------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const isServerError = statusCode >= 500;

  // Never leak internal error messages to clients in production.
  let message = err.message;
  if (isServerError && process.env.NODE_ENV === 'production') {
    message = 'Internal server error. Please try again later.';
  }
  if (isServerError) {
    console.error(`[Error] ${err.stack || err.message}`);
  }

  // Consistent error response shape.
  res.status(statusCode).json({ success: false, message, statusCode });
});

/* ---------------- Boot ---------------- */
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n\x1b[32mLibrary Management API\x1b[0m`);
    console.log(`  ➜  Server:        http://localhost:${PORT}`);
    console.log(`  ➜  Swagger docs:  http://localhost:${PORT}/api-docs`);
    console.log(`  ➜  Environment:   ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app; // exported for testing