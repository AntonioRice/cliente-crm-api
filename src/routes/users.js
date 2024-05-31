const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

const { createUser, completeUserRegistration, getUserById } = require("../controllers/usersController");

router.route("/users").post(isAuthenticatedUser, authorizeRoles(["SuperAdmin", "Admin"]), createUser);
router.route("/users/:id").get(isAuthenticatedUser, getUserById);
router.route("/complete-registration").put(completeUserRegistration);

module.exports = router;
