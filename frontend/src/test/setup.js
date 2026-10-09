import '@testing-library/jest-dom';

// Enable mock fixtures in test environment
import.meta.env.VITE_USE_MOCKS = 'true';

// Polyfill ResizeObserver for React Flow in jsdom
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
