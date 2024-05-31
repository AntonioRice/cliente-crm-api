const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

const { createUser, completeUserRegistration } = require("../controllers/usersController");

router.route("/users").post(createUser);
router.route("/complete-registration").put(completeUserRegistration);

module.exports = router;
