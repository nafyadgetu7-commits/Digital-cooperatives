const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '9319@abri',
  database: process.env.DB_NAME || 'cooperative_management'
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err.message);
  } else {
    console.log('MySQL database connected successfully');
  }
});

module.exports = db;