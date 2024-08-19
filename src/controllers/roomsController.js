const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");

const createRoom = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.body.tenant_id || req.user.tenant_id;
  const { number, name, status } = req.body;

  const query = "SELECT * FROM rooms WHERE number = $1";

  const result = await pool.query(query, [number]);

  if (result.rowCount > 0) {
    return next(new ErrorHandler(`A room number ${number} already exists for tenant ${tenant_id}`));
  }

  const insertQuery = `
  INSERT INTO rooms
  (tenant_id, number, name, status)
  VALUES($1, $2, $3, $4)
  RETURNING *`;

  const values = [tenant_id, number, name, status];

  try {
    const newRoom = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: `Room number ${number} successfully created for tenant ${tenant_id}`,
      data: newRoom.rows,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to create room number ${number} for tenant ${tenant_id}`));
  }
});

const getRooms = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;

  const query = `SELECT * FROM rooms WHERE tenant_id = $1`;

  try {
    const results = await pool.query(query, [tenant_id]);
    res.status(200).json({
      success: true,
      data: results.rows,
      meta: {
        totalRooms: results.rowCount,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to retrieve room number ${number} for tenant ${tenant_id}`));
  }
});

const getRoomById = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const room_id = req.params.id;

  const query = `SELECT * FROM rooms WHERE tenant_id = $1 AND room_id = $2`;

  try {
    const results = await pool.query(query, [tenant_id, room_id]);
    res.status(200).json({
      success: true,
      data: results.rows,
      meta: {
        totalRooms: results.rowCount,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to retrieve room ${number} for tenant ${tenant_id}`));
  }
});

const updateRoom = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const { number, name, status } = req.body;
  const room_id = req.params.id;

  const query = `
  UPDATE rooms 
  SET number = $1, name = $2, status = $3 
  WHERE room_id = $4 AND tenant_id = $5
  RETURNING *`;

  try {
    const results = await pool.query(query, [number, name, status, room_id, tenant_id]);
    res.status(200).json({
      success: true,
      message: `Room number ${number} successfully update for tenant ${tenant_id}`,
      data: results.rows[0],
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to update room number ${number} for tenant ${tenant_id}`));
  }
});

const deleteRoom = catchAsyncErrors(async (req, res, next) => {
  const tenant_id = req.user.tenant_id;
  const room_id = req.params.id;

  const query = `DELETE FROM rooms WHERE tenant_id = $1 AND room_id = $2`;

  try {
    const results = await pool.query(query, [tenant_id, room_id]);
    res.status(204).json({
      success: true,
      message: `Room_id ${room_id} successfully deleted from tenant ${tenant_id}`,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to retrieve room ${room} for tenant ${tenant_id}`));
  }
});

module.exports = { createRoom, getRooms, getRoomById, updateRoom, deleteRoom };
