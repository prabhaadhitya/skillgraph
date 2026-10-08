import { createMlClient } from './ml/mlClient.js';
import { env } from '../config/env.js';

export { createMlClient };

export const mlClient = createMlClient({
  baseUrl: env.ML_SERVICE_URL || 'http://localhost:8000',
  internalKey: env.ML_INTERNAL_KEY || process.env.INTERNAL_KEY || 'dev-internal-key',
  timeoutMs: env.ML_TIMEOUT_MS || 3000,
});

export default mlClient;
