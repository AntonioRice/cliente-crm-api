const jwt = require("jsonwebtoken");
const pool = require("../database/db");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");

const isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorHandler("Please login first to access this resource", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const query = "SELECT * FROM users WHERE user_id = $1";
  const result = await pool.query(query, [decoded.id]);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("User not found", 404));
  }

  req.user = result.rows[0];
  next();
});

const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorHandler(`Role ${req.user.role} is not authorized to access this resource`, 403));
    }
    next();
  };
};

module.exports = { isAuthenticatedUser, authorizeRoles };
