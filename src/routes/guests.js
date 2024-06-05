const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { createGuest, getAllGuests, searchGuest, getCurrentGuests } = require("../controllers/guestsController");

router.route("/guests").get(isAuthenticatedUser, getAllGuests).post(isAuthenticatedUser, createGuest);
router.route("/guests/current").get(isAuthenticatedUser, getCurrentGuests);
router.route("/guests/search").get(isAuthenticatedUser, searchGuest);

module.exports = router;
