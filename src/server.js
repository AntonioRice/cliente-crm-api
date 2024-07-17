require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const cors = require("cors");
const pool = require("./database/db");
const errorMiddleware = require("./middleware/errorMiddleware");

app.use(cors());
app.use(express.json());

((app, basePath) => {
  const routesPath = path.join(__dirname, basePath);
  fs.readdirSync(routesPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const route = require(path.join(routesPath, file));
      app.use("/api/v1", route);
    }
  });
})(app, "./routes");

app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route not found" });
});

app.use(errorMiddleware);

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

process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to unhandled promise rejection");
  server.close(() => {
    process.exit(1);
  });
});
