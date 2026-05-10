const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connect Failed", err.message);
  } else {
    console.log("Connect to Database");
    release();
  }
});

module.exports = pool;
