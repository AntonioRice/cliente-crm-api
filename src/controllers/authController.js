const dotenv = require("dotenv").config();
const pool = require("../database/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const { handleSendEmail } = require("./emailController");

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

const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  const query = "SELECT * FROM users WHERE email = $1";
  const result = await pool.query(query, [email]);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("User not found with this email.", 404));
  }

  const user = result.rows[0];
  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);

  const client_url = process.env.CLIENT_URL || "http://localhost:3010";
  const resetUrl = `${client_url}/password/reset/${resetToken}`;
  const subject = "Cliente.io - Password Reset Request";
  const messageBody = `We have received your request to reset your password. Please use the following link: \n\n ${resetUrl} \n\n If you didn’t make the request, just ignore this email. Your password won’t change until you create a new password.`;

  const updateQuery = `
    UPDATE users
    SET reset_password_token = $1, reset_password_expires = $2
    WHERE user_id = $3
  `;

  await pool.query(updateQuery, [resetPasswordToken, resetPasswordExpires, user.user_id]);

  try {
    await handleSendEmail(user.email, subject, messageBody);

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email}`,
    });
  } catch (error) {
    const clearTokenQuery = `
      UPDATE users
      SET reset_password_token = null, reset_password_expires = null
      WHERE user_id = $1
    `;
    await pool.query(clearTokenQuery, [user.user_id]);

    return next(new ErrorHandler("Email could not be sent", 500));
  }
});

const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const query = `
    SELECT * FROM users
    WHERE reset_password_token = $1 AND reset_password_expires > $2
  `;
  const result = await pool.query(query, [resetPasswordToken, new Date(Date.now())]);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Invalid or expired token", 400));
  }

  try {
    const user = result.rows[0];
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(req.body.password, salt);

    const updateQuery = `
      UPDATE users
      SET password = $1, reset_password_token = null, reset_password_expires = null
      WHERE user_id = $2
    `;

    await pool.query(updateQuery, [newPassword, user.user_id]);

    sendToken(user, 200, res);
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Password could not be reset", 500));
  }
});

module.exports = { login, logout, forgotPassword, resetPassword };
