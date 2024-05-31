const express = require("express");
const router = express.Router();

const { login, logout } = require("../controllers/authController");
const { isAuthenticatedUser } = require("../middleware/auth");

router.route("/login").post(login);
router.route("/logout").post(isAuthenticatedUser, logout);

module.exports = router;
