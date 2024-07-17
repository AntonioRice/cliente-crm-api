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
  const { page = 1, limit = 10, sortKey = "created_date", sortDirection = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const sortColumn = sortKey;
  const sortOrder = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const query = `
  SELECT user_id, email, first_name, last_name, phone_number, preferences, role, tenant_id, user_name, status, profile_picture 
  FROM users
  WHERE tenant_id = $1
  ORDER BY ${sortColumn} ${sortOrder}
  LIMIT $2 OFFSET $3
  `;
  const countQuery = `SELECT COUNT(*) FROM users WHERE tenant_id = $1`;

  try {
    const [usersResult, countResult] = await Promise.all([
      pool.query(query, [tenant_id, limit, offset]),
      pool.query(countQuery, [tenant_id]),
    ]);

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
    return next(
      new ErrorHandler(`Error: Unable to retrieve users for tenant ID ${tenant_id}. Message: ${err.message}`, 500)
    );
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
    return next(
      new ErrorHandler(`Error: Unable to Upload Profile Pic for User: ${user_id}. Message: ${err.message}`, 500)
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

const bufferToBase64 = (buffer) => {
  if (buffer) {
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }
  return null;
};

module.exports = { createUser, getUserById, getUsers, updateUserById, updateProfilePic, completeUserRegistration };
