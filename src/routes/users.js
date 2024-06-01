const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

const {
  createUser,
  completeUserRegistration,
  getUserById,
  updateProfilePic,
  updateUserById,
} = require("../controllers/usersController");

router.route("/users").post(isAuthenticatedUser, authorizeRoles(["SuperAdmin", "Admin"]), createUser);
router.route("/users/:id").get(isAuthenticatedUser, getUserById).put(isAuthenticatedUser, updateUserById);
router.route("/complete-registration").put(completeUserRegistration);
router.route("/update-profile-picture").put(isAuthenticatedUser, updateProfilePic);

module.exports = router;
