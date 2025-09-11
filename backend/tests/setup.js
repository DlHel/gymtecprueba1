require('dotenv').config({ path: './backend/config.env' });
console.log('JWT_SECRET from setup.js:', process.env.JWT_SECRET);