const bcrypt = require("bcryptjs");
const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

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

    res.status(201).json({
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
  const { user_id, phone_number, preferences, password, first_name, last_name, email } = req.body;

  if (!user_id || !phone_number || !preferences || !password || !first_name || !last_name || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (isNaN(parseInt(user_id, 10))) {
    return res.status(400).json({ message: "Invalid user_id" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const status = "Active";
    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, email = $3, phone_number = $4, preferences = $5, password = $6, status = $7, updated_date = CURRENT_TIMESTAMP
      WHERE user_id = $8
      RETURNING *;
    `;

    const values = [
      first_name,
      last_name,
      email,
      phone_number,
      JSON.stringify(preferences),
      hashedPassword,
      status,
      parseInt(user_id, 10),
    ];

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
    return next(new ErrorHandler(`Error: Unable to complete registration. Message: ${error.message}`, 500));
  }
});

const getUserById = catchAsyncErrors(async (req, res, next) => {
  const userId = req.params.id;
  const query = `
  SELECT user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, status, profile_picture FROM users
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

const updateProfilePic = catchAsyncErrors(upload.single("profile_picture"), async (req, res, next) => {
  const { userId } = req.body;
  const profilePicture = req.file.buffer;

  try {
    const query = `
    UPDATE users 
    SET profile_picture = $1, updated_date = CURRENT_TIMESTAMP 
    WHERE user_id = $2
    RETURNING user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, profile_picture
  `;
    const values = [profilePicture, userId];
    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    return next(
      new ErrorHandler(`Error: Unable to Upload Profile Pic for User: ${userId}. Message: ${err.message}`, 500)
    );
  }
});

const updateUserById = catchAsyncErrors(async (req, res, next) => {
  const { id: userId } = req.params;
  const allowedFields = [
    "tenant_id",
    "user_name",
    "first_name",
    "last_name",
    "role",
    "phone_number",
    "email",
    "preferences",
  ];
  const values = [];
  let setClause = [];
  let counter = 1;

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      setClause.push(`${field} = $${counter++}`);
      values.push(field === "preferences" ? JSON.stringify(req.body[field]) : req.body[field]);
    }
  });

  setClause.push(`updated_date = CURRENT_TIMESTAMP`);
  values.push(userId);

  const query = `
    UPDATE users 
    SET ${setClause.join(", ")}
    WHERE user_id = $${counter}
    RETURNING user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, profile_picture
  `;

  try {
    const result = await pool.query(query, values);
    res.status(200).json({
      success: true,
      message: "User successfully updated",
      data: result.rows[0],
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to update User: ${userId}. Message: ${err.message}`, 500));
  }
});

module.exports = { createUser, completeUserRegistration, getUserById, updateProfilePic, updateUserById };
