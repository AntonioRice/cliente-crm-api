const dotenv = require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../database/db");
const crypto = require("crypto");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { handleSendEmail } = require("./emailController");

const createUser = catchAsyncErrors(async (req, res, next) => {
  const { user_name, first_name, last_name, role, email } = req.body;
  const tenant_id = req.body.tenant_id || req.user.tenant_id;

  const query = "SELECT * FROM users WHERE email = $1";
  const result = await pool.query(query, [email]);

  if (result.rowCount > 0) {
    return next(new ErrorHandler("A user with this email already exists"));
  }

  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const insertQuery = `
    INSERT INTO users 
    (tenant_id, user_name, first_name, last_name, role, email, reset_password_token, reset_password_expires) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING *`;

  const values = [tenant_id, user_name, first_name, last_name, role, email, resetPasswordToken, resetPasswordExpires];

  try {
    const newUser = await pool.query(insertQuery, values);

    if (newUser.rows[0]) {
      const client_url = process.env.CLIENT_URL || "http://localhost:3010";
      const registrationUrl = `${client_url}/register/${resetToken}?user_id=${newUser.rows[0].user_id}&first_name=${first_name}&last_name=${last_name}&email=${email}`;
      const subject = "Cliente.io - New User Registration";
      const messageBody = `Dear ${first_name} ${last_name},\n\nWelcome to Cliente.io! We are pleased to have you join us.\n\nYour username is: ${user_name}. To complete your registration and get started, please click the link below:\n\n${registrationUrl}\n\nIf you encounter any issues during the registration process, please don't hesitate to reach out to your designated Administrator for assistance.\n\nBest regards,\nThe Cliente.io Team`;

      await handleSendEmail(email, subject, messageBody);
    }

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

const getUsers = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const { page = 1, limit = 10, sortKey = "created_date", sortDirection = "DESC", searchQuery } = req.query;
  const offset = (page - 1) * limit;
  const sortColumn = sortKey;
  const sortOrder = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const query = `
  SELECT user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, status, profile_picture 
  FROM users
  WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
  AND tenant_id = $2
  ORDER BY ${sortColumn} ${sortOrder}
  LIMIT $3 OFFSET $4
  `;
  const countQuery = `SELECT COUNT(*) FROM users WHERE tenant_id = $1`;

  try {
    const [usersResult, countResult] = await Promise.all([pool.query(query, [`%${searchQuery}%`, tenant_id, limit, offset]), pool.query(countQuery, [tenant_id])]);

    const totalUsers = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalUsers / limit);

    const processedUsers = usersResult.rows.map((user) => ({
      ...user,
      profile_picture: bufferToBase64(user.profile_picture),
    }));

    res.status(200).json({
      success: true,
      data: processedUsers,
      meta: {
        totalUsers,
        totalPages,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to retrieve users for tenant ID ${tenant_id}. Message: ${err.message}`, 500));
  }
});

const getUserById = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const userId = req.params.id;
  const query = `
  SELECT user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, status, profile_picture FROM users
  WHERE user_id = $1 AND tenant_id = $2`;

  try {
    const user = await pool.query(query, [userId, tenant_id]);

    if (!user) {
      res.status(404).json({
        success: false,
        message: `User: ${userId} not found`,
      });
    }

    const processedUser = user.rows.map((data) => ({
      ...data,
      profile_picture: bufferToBase64(data.profile_picture),
    }));

    res.status(200).json({
      success: true,
      data: processedUser[0],
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to retrieve User: ${userId}. Message: ${err.message}`, 500));
  }
});

const deleteUserById = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const userId = req.params.id;
  const query = `DELETE FROM users WHERE user_id = $1 AND tenant_id = $2`;

  try {
    await pool.query(query, [userId, tenant_id]);
    res.status(204).json({
      success: true,
      message: `User ${userId}, successfully deleted`,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to delete User: ${userId}. Message: ${err.message}`, 500));
  }
});

const updateProfilePic = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const user_id = req.params.id;
  const profilePicture = req.file.buffer;

  try {
    const query = `
    UPDATE users 
    SET profile_picture = $1, updated_date = CURRENT_TIMESTAMP 
    WHERE user_id = $2 AND tenant_id = $3
    RETURNING user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, profile_picture
  `;
    const values = [profilePicture, user_id, tenant_id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return next(new ErrorHandler(`User not found or you don't have permission to update this user`, 404));
    }

    const processedUser = result.rows.map((data) => ({
      ...data,
      profile_picture: bufferToBase64(data.profile_picture),
    }));

    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: processedUser[0],
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to Upload Profile Pic for User: ${user_id}. Message: ${err.message}`, 500));
  }
});

const updateUserById = catchAsyncErrors(async (req, res, next) => {
  const { id: userId } = req.params;
  const { role, tenant_id } = req.body;
  const allowedFields = ["tenant_id", "user_name", "first_name", "last_name", "role", "phone_number", "email", "preferences"];

  const userRole = req.user.role;
  const userTenantId = req.user.tenant_id;

  if (role) {
    if (userRole === "Admin") {
      if (role !== "Employee" && role !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Admins can only set roles to 'employee' or 'admin'.",
        });
      }
      if (tenant_id !== userTenantId) {
        return res.status(403).json({
          success: false,
          message: "Admins can only set roles for users within their business.",
        });
      }
    } else if (userRole !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update roles.",
      });
    }
  }

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

const completeUserRegistration = catchAsyncErrors(async (req, res, next) => {
  const { phone_number, preferences, newPassword, first_name, last_name, email } = req.body;
  const passwordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const query = `
  SELECT * FROM users
  WHERE reset_password_token = $1 AND reset_password_expires > $2
  `;

  const result = await pool.query(query, [passwordToken, new Date(Date.now())]);

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Invalid or expired token", 400));
  }

  const user_id = result.rows[0].user_id;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const status = "Active";
    const query = `
      UPDATE users
      SET first_name = $1, last_name = $2, email = $3, phone_number = $4, preferences = $5, password = $6, status = $7, updated_date = CURRENT_TIMESTAMP
      WHERE user_id = $8
      RETURNING *
    `;

    const values = [first_name, last_name, email, phone_number, JSON.stringify(preferences), hashedPassword, status, parseInt(user_id, 10)];
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

const bufferToBase64 = (buffer) => {
  if (buffer) {
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }
  return null;
};

module.exports = { createUser, getUserById, getUsers, updateUserById, updateProfilePic, deleteUserById, completeUserRegistration };
