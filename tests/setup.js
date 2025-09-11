/**
 * Setup para Jest - Configuración global para pruebas unitarias
 */

// Mock básico para evitar errores en Node.js
global.window = global.window || {};
global.document = global.document || {};

// Mock de console methods para limpiar output de tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
});
