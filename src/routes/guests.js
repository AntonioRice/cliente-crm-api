const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { createGuest, getGuests } = require("../controllers/guestsController");

router.route("/guests").get(isAuthenticatedUser, getGuests).post(isAuthenticatedUser, createGuest);

module.exports = router;
