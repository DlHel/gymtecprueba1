
const jwt = require('./backend/node_modules/jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/config.env') });

const secret = process.env.JWT_SECRET;
console.log('Secret used:', secret); // Debug to see if it reads correctly

const payload = {
    id: 1,
    username: 'admin',
    role: 'Admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log('TOKEN_START');
console.log(token);
console.log('TOKEN_END');
