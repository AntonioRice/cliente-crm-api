const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const {
  createGuest,
  getGuestById,
  getAllGuests,
  getCurrentGuests,
  searchGuests,
  deleteGuest,
} = require("../controllers/guestsController");

router.route("/guests/search").get(isAuthenticatedUser, searchGuests);
router.route("/guests/current").get(isAuthenticatedUser, getCurrentGuests);
router.route("/guests/:id").get(isAuthenticatedUser, getGuestById).delete(isAuthenticatedUser, deleteGuest);
router.route("/guests").get(isAuthenticatedUser, getAllGuests).post(isAuthenticatedUser, createGuest);

module.exports = router;
