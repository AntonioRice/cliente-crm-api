const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { createReservation, getReservations, getReservationById, getReservationByGuestId, getReservationsAnalytics, getReservationsByMonth } = require("../controllers/reservationsController");

router.get("/guests/:id/reservations", isAuthenticatedUser, getReservationByGuestId);
router.route("/reservations/analytics").get(isAuthenticatedUser, getReservationsAnalytics);
router.route("/reservations/calendar").get(isAuthenticatedUser, getReservationsByMonth);
router.route("/reservations/:id").get(isAuthenticatedUser, getReservationById).put(isAuthenticatedUser, getReservationById);
router.route("/reservations").get(isAuthenticatedUser, getReservations).post(isAuthenticatedUser, createReservation);

module.exports = router;
