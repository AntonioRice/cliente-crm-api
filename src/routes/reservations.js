const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { getReservations } = require("../controllers/reservationsController");

router.route("/reservations").get(isAuthenticatedUser, getReservations);

module.exports = router;
