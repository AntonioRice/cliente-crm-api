const express = require("express");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } });

const { createUser, completeUserRegistration, getUsers, getUserById, updateProfilePic, updateUserById } = require("../controllers/usersController");

router.route("/users").post(isAuthenticatedUser, authorizeRoles(["SuperAdmin", "Admin"]), createUser);
router.route("/users").get(isAuthenticatedUser, authorizeRoles(["SuperAdmin", "Admin"]), getUsers);
router.route("/users/:id").get(isAuthenticatedUser, getUserById).put(isAuthenticatedUser, updateUserById);
router.route("/users/profile-picture/:id").put(isAuthenticatedUser, upload.single("profile_picture"), updateProfilePic);
router.route("/complete-registration/:token").put(completeUserRegistration);

module.exports = router;
