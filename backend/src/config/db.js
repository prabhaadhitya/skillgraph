import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Enforce strict query filtering across Mongoose
mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB instance.
 * @param {string} [uri] - Optional MongoDB URI (defaults to env.MONGODB_URI)
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB(uri) {
  const connectionUri = uri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(connectionUri);
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.error('Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

/**
 * Disconnect from MongoDB instance.
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export default { connectDB, disconnectDB };
