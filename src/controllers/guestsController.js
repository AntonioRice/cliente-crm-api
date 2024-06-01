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

  const guestQuery = `
      INSERT INTO guests 
      (tenant_id, first_name, last_name, date_of_birth, nationality, address,
      identification_number, email, phone_number, emergency_contact, room_number, 
      check_in, check_out, license_plate_number, payment_method) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *`;

  const reservationQuery = `
      INSERT INTO reservations 
      (tenant_id, primary_guest_id, check_in, check_out, rooms, total_amount) 
      VALUES($1, $2, $3, $4, $5, $6) 
      RETURNING *`;

  const reservationGuestQuery = `
      INSERT INTO reservation_guests 
      (reservation_id, guest_id, tenant_id) 
      VALUES($1, $2, $3)`;

  const addressJson = JSON.stringify(address);
  const emergencyContactJson = JSON.stringify(emergency_contact);
  const guestValues = [
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
    // Create new guest
    const newGuest = await pool.query(guestQuery, guestValues);
    const guestId = newGuest.rows[0].guest_id;

    // Create new reservation
    const reservationValues = [
      tenant_id,
      guestId,
      check_in,
      check_out,
      `{${room_number}}`,
      0.0, // Assuming total_amount is calculated elsewhere
    ];
    const newReservation = await pool.query(reservationQuery, reservationValues);
    const reservationId = newReservation.rows[0].reservation_id;

    // Link guest to reservation
    await pool.query(reservationGuestQuery, [reservationId, guestId, tenant_id]);

    res.status(201).json({
      success: true,
      message: `New Guest: ${guestId}, for tenant: ${tenant_id}, successfully created and linked to reservation: ${reservationId}`,
      data: newGuest.rows[0],
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to create new guest and reservation. Message: ${err.message}`, 500));
  }
});

const getGuests = catchAsyncErrors(async (req, res, next) => {
  const query = "SELECT * FROM guests";

  try {
    const guests = await pool.query(query);

    res.status(200).json({
      success: true,
      total: guests.rows.length,
      data: guests.rows,
    });
  } catch (error) {
    return next(new ErrorHandler(`Error: Unable to retrieve Guests. Message: ${err.message}`, 500));
  }
});

module.exports = { createGuest, getGuests };
