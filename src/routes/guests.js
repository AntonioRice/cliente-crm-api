const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { createGuest, getGuests, searchGuest } = require("../controllers/guestsController");

router.route("/guests").get(isAuthenticatedUser, getGuests).post(isAuthenticatedUser, createGuest);
router.route("/guests/search").get(isAuthenticatedUser, searchGuest);
module.exports = router;
