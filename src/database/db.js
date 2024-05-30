require("dotenv").config();
const { Pool } = require("pg");

// Create a pool instance
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Connect to the database
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to Database", err.stack);
    return;
  }
  console.log("Database connected.");
  release();
});

module.exports = pool;
