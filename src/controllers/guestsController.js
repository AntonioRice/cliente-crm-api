const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const moment = require("moment-timezone");

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
    room_numbers,
    check_in,
    check_out,
    payment_method,
    total_amount,
    payment_status,
    vehicle,
  } = req.body;

  const guestQuery = `
      INSERT INTO guests 
      (tenant_id, first_name, last_name, date_of_birth, nationality, address,
      identification_number, email, phone_number, emergency_contact, vehicle) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`;

  const reservationQuery = `
      INSERT INTO reservations 
      (tenant_id, primary_guest_id, check_in, check_out, room_numbers, payment_method, total_amount, payment_status, guest_status) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`;

  const reservationGuestQuery = `
      INSERT INTO reservation_guests 
      (reservation_id, guest_id, tenant_id) 
      VALUES($1, $2, $3)`;

  const addressJson = JSON.stringify(address);
  const emergencyContactJson = JSON.stringify(emergency_contact);
  const vehicleJson = JSON.stringify(vehicle);
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
    vehicleJson,
  ];

  try {
    // Create new guest
    const newGuest = await pool.query(guestQuery, guestValues);
    const guestId = newGuest.rows[0].guest_id;

    // Calculate guest_status
    const ecuadorTimeZone = "America/Guayaquil";
    const checkOutMoment = moment.tz(check_out, ecuadorTimeZone).set({ hour: 15, minute: 0, second: 0 });
    const guestStatus = moment().isBefore(checkOutMoment) ? "active" : "inactive";

    // Create new reservation
    const reservationValues = [
      tenant_id,
      guestId,
      check_in,
      check_out,
      `{${room_numbers}}`,
      payment_method,
      total_amount,
      payment_status,
      guestStatus,
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
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const guestsQuery = `
      SELECT * FROM guests
      ORDER BY created_date DESC
      LIMIT $1 OFFSET $2
      `;
    const countQuery = `SELECT COUNT(*) FROM guests`;

    const [guestsResult, countResult] = await Promise.all([
      pool.query(guestsQuery, [limit, offset]),
      pool.query(countQuery),
    ]);

    const guests = guestsResult.rows;
    const totalGuests = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalGuests / limit);

    res.status(200).json({
      success: true,
      data: guests,
      meta: {
        totalGuests,
        totalPages,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to fetch guests. Message: ${err.message}`, 500));
  }
});

const searchGuest = catchAsyncErrors(async (req, res, next) => {
  const { searchQuery } = req.query;
  if (!searchQuery) {
    return next(new ErrorHandler("Search query is required", 400));
  }
  const query = `
    SELECT * from guests
    WHERE first_name ILIKE $1 OR last_name ILIKE $1
    ORDER BY first_name DESC
    LIMIT 10 OFFSET 0
  `;

  try {
    const values = [`%${searchQuery}%`];
    const results = await pool.query(query, values);
    res.status(200).json({
      success: true,
      data: results.rows,
    });
  } catch (error) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = { createGuest, getGuests, searchGuest };
