// setupDb.js
require('dotenv').config();
const pool = require('./db');

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id        SERIAL PRIMARY KEY,
        email     VARCHAR(255) UNIQUE NOT NULL,
        password  VARCHAR(255) NOT NULL,
        name      VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating table:', err.message);
    process.exit(1);
  }
}

createTables();