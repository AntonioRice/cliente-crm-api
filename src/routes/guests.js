const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { createGuest } = require("../controllers/guestsController");

router.route("/guests").post(isAuthenticatedUser, createGuest);

module.exports = router;
