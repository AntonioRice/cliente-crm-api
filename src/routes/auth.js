const express = require("express");
const router = express.Router();

const { login, logout, forgotPassword, resetPassword } = require("../controllers/authController");
const { isAuthenticatedUser } = require("../middleware/auth");

router.route("/login").post(login);
router.route("/logout").post(isAuthenticatedUser, logout);
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:token").put(resetPassword);

module.exports = router;
