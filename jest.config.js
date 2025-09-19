require('dotenv').config({ path: './backend/config.env' });

module.exports = {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\.m?js$': 'babel-jest',
    },
    globalSetup: './backend/tests/setup.js'
};