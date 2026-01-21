module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server-clean.js'
  ],
  testTimeout: 10000,
  verbose: true
};
