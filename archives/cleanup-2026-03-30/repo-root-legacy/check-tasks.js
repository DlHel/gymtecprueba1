require('dotenv').config({path:'/var/www/gymtec/backend/config.env'});
const db = require('/var/www/gymtec/backend/src/mysql-database');
db.query('SELECT COUNT(*) as total FROM MaintenanceTasks')
  .then(r => { console.log('Total MaintenanceTasks:', JSON.stringify(r)); process.exit(0); })
  .catch(e => { console.log('Error:', e.message); process.exit(1); });
