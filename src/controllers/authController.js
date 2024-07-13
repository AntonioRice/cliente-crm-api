const pool = require("../database/db");
const bcrypt = require("bcryptjs");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");

const login = catchAsyncErrors(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new ErrorHandler("Please enter user_name and password", 400));
  }

  const query = "SELECT * FROM users WHERE user_name = $1";
  const result = await pool.query(query, [username]);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Invalid user_name or password.", 401));
  }

  const user = result.rows[0];
  const passwordVerified = await bcrypt.compare(password, user.password);

  if (!passwordVerified) {
    return next(new ErrorHandler("Invalid user_name or password.", 401));
  }

  sendToken(user, 200, res);
});

const logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = { login, logout };
