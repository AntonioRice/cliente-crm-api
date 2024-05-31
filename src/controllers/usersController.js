const bcrypt = require("bcryptjs");
const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const createUser = catchAsyncErrors(async (req, res, next) => {
  const { tenant_id, user_name, first_name, last_name, role, email } = req.body;
  const query = `
    INSERT INTO users 
    (tenant_id, user_name, first_name, last_name, role, email) 
    VALUES($1, $2, $3, $4, $5, $6) 
    RETURNING *`;

  const values = [tenant_id, user_name, first_name, last_name, role, email];

  try {
    const newUser = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: `New User, ${newUser.rows[0].email}, for tenant: ${tenant_id}, successfully created`,
      data: newUser.rows,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to create new user. Message: ${err.message}`, 500));
  }
});

const completeUserRegistration = catchAsyncErrors(async (req, res, next) => {
  const { user_id, phone_number, preferences, password } = req.body;

  if (!user_id || !phone_number || !preferences || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
    UPDATE users
    SET phone_number = $1, preferences = $2, password = $3, updated_date = CURRENT_TIMESTAMP
    WHERE user_id = $4
    RETURNING *;
  `;

    const values = [phone_number, JSON.stringify(preferences), hashedPassword, user_id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `Registration successfully completed`,
      data: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to complete registration. Message: ${err.message}`, 500));
  }
});

const getUserById = catchAsyncErrors(async (req, res, next) => {
  const userId = req.params.id;
  const query = `
  SELECT user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name FROM users
  WHERE user_id = $1`;

  try {
    const user = await pool.query(query, [userId]);

    if (!user) {
      res.status(404).json({
        success: false,
        message: `User: ${userId} not found`,
      });
    }

    res.status(200).json({
      success: true,
      total: user.rows.length,
      data: user.rows[0],
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to retrieve User: ${userId}. Message: ${err.message}`, 500));
  }
});

module.exports = { createUser, completeUserRegistration, getUserById };
