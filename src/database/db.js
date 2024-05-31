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

// Log connection events
pool.on("connect", () => {
  console.log("Connected to the database.");
});

pool.on("remove", () => {
  console.log("Client removed");
});

process.on("SIGINT", () => {
  pool.end(() => {
    console.log("pool has ended");
    process.exit(0);
  });
});

module.exports = pool;
