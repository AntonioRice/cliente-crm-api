const { Client } = require("pg");

const client = new Client({
  host: "cliente-crm-db-instance.c1sk4ykmoshj.us-east-2.rds.amazonaws.com",
  port: 5432,

  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect((err) => {
  if (err) {
    console.error("Connection Error!", err.stack);
    return;
  }

  console.log("Database connected.");
});

module.exports = client;
