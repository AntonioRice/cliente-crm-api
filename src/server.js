require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const client = require("./database/db.js");

//middleware
app.use(cors());
app.use(express.json());

//routes
//create a tenant
app.post("/tenants", async (req, res) => {
  try {
    const { tenant_name, membership, status } = req.body;
    const newTenant = await client.query(
      "INSERT INTO tenants (tenant_name, membership, status) VALUES($1, $2, $3) RETURNING *",
      [tenant_name, membership, status]
    );
    res.json(newTenant);
    client.end();
  } catch (err) {
    console.error(err.message);
    client.end();
  }
});

//get all tenants
app.get("/tenants", async (req, res) => {
  try {
  } catch (err) {
    console.error(err.message);
  }
});

//update a tenant
app.put("/tenants/:id", async (req, res) => {
  try {
  } catch (err) {
    console.error(err.message);
  }
});

//delete a tenant

app.delete("/tenants/:id", async (req, res) => {
  try {
  } catch (err) {
    console.error(err.message);
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server stated on port ${PORT}`);
});

// Handling Unhandled Promise Rejections
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to unhandled promise rejection");
  // app.close(() => {
  //   process.exit(1);
  // });
});
