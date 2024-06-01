const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const createGuest = catchAsyncErrors(async (req, res, next) => {
  const {
    tenant_id,
    first_name,
    last_name,
    date_of_birth,
    nationality,
    address,
    identification_number,
    email,
    phone_number,
    emergency_contact,
    room_number,
    check_in,
    check_out,
    license_plate_number,
    payment_method,
  } = req.body;
  const query = `
    INSERT INTO guests 
    (tenant_id, first_name, last_name, date_of_birth, nationality, address,
    identification_number, email, phone_number, emergency_contact, room_number, 
    check_in, check_out, license_plate_number, payment_method) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
    RETURNING *`;

  const addressJson = JSON.stringify(address);
  const emergencyContactJson = JSON.stringify(emergency_contact);
  const values = [
    tenant_id,
    first_name,
    last_name,
    date_of_birth,
    nationality,
    addressJson,
    identification_number,
    email,
    phone_number,
    emergencyContactJson,
    room_number,
    check_in,
    check_out,
    license_plate_number,
    payment_method,
  ];

  try {
    const newGuest = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: `New Guest: ${newGuest.rows[0].guest_id}, for tenant: ${tenant_id}, successfully created`,
      data: newGuest.rows[0],
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to create new user. Message: ${err.message}`, 500));
  }
});

module.exports = { createGuest };
