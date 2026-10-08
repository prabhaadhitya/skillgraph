/**
 * SkillGraph API Service wrapper.
 * Re-exports the unified http client from ./http.js to preserve backward compatibility.
 */

import {
  ApiError,
  USE_MOCKS,
  emitToast,
  sendRequest,
  http,
  api,
  apiWithMeta,
} from './http.js';

export {
  ApiError,
  USE_MOCKS,
  emitToast,
  sendRequest,
  http,
  api,
  apiWithMeta,
};

export default api;
