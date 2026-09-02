/**
 * Authentication controller - register / login / own profile.
 */

const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { signToken } = require('../utils/jwt');
const { asyncHandler, ApiError, serialize } = require('../utils/validation');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Public. Creates a new user (student or librarian). Password is hashed with
 * bcrypt (10 rounds) before being stored.
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const role = req.body.role || 'student';

  const existing = await userModel.getUserByEmail(email);
  if (existing) {
    throw new ApiError('Email is already registered. Please log in.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userModel.createUser({ name, email, password: hashedPassword, role });

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: serialize(userModel.toPublicUser(user)),
      role: role === 'librarian'
        ? 'You can now log in to manage books, users and transactions.'
        : 'You can now log in to browse and borrow books.',
    },
  });
});

/**
 * POST /api/auth/login
 * Public. Verifies credentials and responds with a JWT.
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.getUserByEmail(email);
  if (!user) {
    throw new ApiError('Invalid email or password.', 401);
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw new ApiError('Invalid email or password.', 401);
  }

  const token = signToken({ userId: user.userId, role: user.role, email: user.email });

  return res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      user: serialize(userModel.toPublicUser(user)),
    },
  });
});

/**
 * GET /api/auth/profile
 * Authenticated. Returns the logged-in user's profile.
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await userModel.getUserById(req.user.userId);
  if (!user) {
    throw new ApiError('User no longer exists.', 404);
  }

  return res.json({
    success: true,
    message: 'Profile fetched successfully',
    data: { user: serialize(userModel.toPublicUser(user)) },
  });
});

/**
 * PUT /api/auth/profile
 * Authenticated. Updates the logged-in user's own profile (name, email,
 * password). Role changes are NOT allowed here - use the librarian endpoint.
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (email) {
    const result = await userModel.updateUserEmail(req.user.userId, email);
    if (result === 'conflict') {
      throw new ApiError('Email is already registered.', 409);
    }
    if (!result) {
      throw new ApiError('User no longer exists.', 404);
    }
  }

  const updates = {};
  if (name) updates.name = name;
  if (password) updates.password = await bcrypt.hash(password, SALT_ROUNDS);

  const updated = await userModel.updateUser(
    email ? result.userId : req.user.userId,
    updates
  );
  if (!updated) {
    throw new ApiError('User no longer exists.', 404);
  }

  return res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: serialize(userModel.toPublicUser(updated)) },
  });
});