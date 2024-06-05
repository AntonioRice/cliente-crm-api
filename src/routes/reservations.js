const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { getReservations, getReservationsById } = require("../controllers/reservationsController");

router.route("/reservations").get(isAuthenticatedUser, getReservations);
router.route("/reservations/:id").get(isAuthenticatedUser, getReservationsById);

module.exports = router;
