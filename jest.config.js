require('dotenv').config({ path: './backend/config.env' });

module.exports = {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\.m?js$': 'babel-jest',
    },
    transformIgnorePatterns: ['/node_modules/(?!your-es-module-package-here)']
};