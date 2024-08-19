const express = require("express");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

const { createRoom, getRooms, getRoomById, updateRoom, deleteRoom } = require("../controllers/roomsController");

router.route("/rooms").post(isAuthenticatedUser, createRoom).get(isAuthenticatedUser, getRooms);
router.route("/rooms/:id").get(isAuthenticatedUser, getRoomById).put(isAuthenticatedUser, updateRoom).delete(isAuthenticatedUser, deleteRoom);

module.exports = router;
