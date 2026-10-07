import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { formatUser } from '../utils/formatUser.js';

// Pre-generated cost-12 bcrypt hash to equalize timing when user email is not found
const DUMMY_HASH = '$2b$12$pFqGvb99GqQ3gJiYCO7HCeS98BUC9ME3WvIXzaxVrrqyktNxwv1lG';

/**
 * Sign a JWT token for a user.
 * @param {Object} payload
 * @param {string} payload.sub - User ID
 * @param {string} payload.role - User role
 * @returns {string} JWT string
 */
export const signToken = ({ sub, role }) =>
  jwt.sign({ sub, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

/**
 * Register a new student account.
 * Role is ALWAYS 'student'. Passwords hashed with bcrypt cost 12.
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ user: Object, token: string }>}
 */
export const register = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'student', // Registration can never create an admin
  });

  const token = signToken({ sub: user._id.toString(), role: user.role });

  return {
    user: formatUser(user),
    token,
  };
};

/**
 * Login user with email and password.
 * Always returns identical 401 message for unknown email and wrong password.
 * Runs dummy bcrypt comparison when email is unknown to mitigate timing attacks.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ user: Object, token: string }>}
 */
export const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail })
    .select('+passwordHash')
    .populate('targetCareerId');

  if (!user) {
    // Run dummy compare to match timing of password hashing verification
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role });

  return {
    user: formatUser(user),
    token,
  };
};

/**
 * Fetch current authenticated user.
 * @param {string} userId
 * @returns {Promise<{ user: Object }>}
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId).populate('targetCareerId');
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  return {
    user: formatUser(user),
  };
};

export default {
  signToken,
  register,
  login,
  getMe,
};
