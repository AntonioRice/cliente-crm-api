require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./database/db");
const errorMiddleware = require("./middleware/errorMiddleware");
const auth = require("./routes/auth");
const tenants = require("./routes/tenants");
const users = require("./routes/users");
const guests = require("./routes/guests");

// Middleware
app.use(cors());
app.use(express.json());

//Register Routes
app.use("/api/v1", auth);
app.use("/api/v1", tenants);
app.use("/api/v1", users);
app.use("/api/v1", guests);

// Middleware
app.use(errorMiddleware);

// Connect to the database
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to Database", err.stack);
    return;
  }
  console.log("Database connected.");
  release();
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server stated on port ${PORT}`);
});

// Handling Unhandled Promise Rejections
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to unhandled promise rejection");
  server.close(() => {
    process.exit(1);
  });
});
