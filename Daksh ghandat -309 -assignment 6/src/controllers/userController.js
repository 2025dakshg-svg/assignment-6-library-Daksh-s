/**
 * User management controller - librarian-only admin endpoints.
 */

const userModel = require('../models/userModel');
const { asyncHandler, ApiError, serialize } = require('../utils/validation');

/**
 * GET /api/users
 * Librarian only. List every registered user (password never exposed).
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await userModel.getAllUsers();
  const publicUsers = users.map((user) => userModel.toPublicUser(user));
  return res.json({
    success: true,
    message: `${users.length} user(s) returned`,
    data: { users: serialize(publicUsers) },
  });
});

/**
 * GET /api/users/:id
 * Librarian only. Fetch a single user's profile.
 */
exports.getUser = asyncHandler(async (req, res) => {
  const user = await userModel.getUserById(req.params.id);
  if (!user) {
    throw new ApiError('User not found.', 404);
  }
  return res.json({
    success: true,
    message: 'User fetched successfully',
    data: { user: serialize(userModel.toPublicUser(user)) },
  });
});

/**
 * PUT /api/users/:id/role
 * Librarian only. Promote/demote a user between "student" and "librarian".
 */
exports.updateRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await userModel.getUserById(req.params.id);
  if (!user) {
    throw new ApiError('User not found.', 404);
  }
  const updated = await userModel.updateRole(req.params.id, role);
  return res.json({
    success: true,
    message: `User role updated to "${role}"`,
    data: { user: serialize(userModel.toPublicUser(updated)) },
  });
});

/**
 * DELETE /api/users/:id
 * Librarian only. Delete a user account.
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await userModel.getUserById(req.params.id);
  if (!user) {
    throw new ApiError('User not found.', 404);
  }
  await userModel.deleteUser(req.params.id);
  return res.json({
    success: true,
    message: 'User deleted successfully',
    data: { userId: req.params.id },
  });
});