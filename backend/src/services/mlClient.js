import { createMlClient } from './ml/mlClient.js';
import { env } from '../config/env.js';

export { createMlClient };

const internalKey = (env.ML_INTERNAL_KEY || process.env.INTERNAL_KEY || '').trim();

export const mlClient = createMlClient({
  baseUrl: env.ML_SERVICE_URL || 'http://localhost:8000',
  internalKey,
  timeoutMs: env.ML_TIMEOUT_MS || 3000,
});

export default mlClient;
