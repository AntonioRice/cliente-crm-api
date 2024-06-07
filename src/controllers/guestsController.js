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

const getAllGuests = catchAsyncErrors(async (req, res, next) => {
  const { page = 1, limit = 10, sortKey = "created_date", sortDirection = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const sortColumn = sortKey;
  const sortOrder = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  try {
    const guestsQuery = `
      SELECT g.guest_id, g.tenant_id, g.first_name, g.last_name, g.date_of_birth, 
             g.nationality, g.address, g.identification_number, g.email, 
             g.phone_number, g.emergency_contact, g.vehicle, g.created_date, 
             g.updated_date,
             r.reservation_id, r.primary_guest_id, r.check_in, r.check_out, 
             r.room_numbers, r.total_amount, r.guest_status
      FROM guests g
      LEFT JOIN reservation_guests rg ON g.guest_id = rg.guest_id
      LEFT JOIN reservations r ON rg.reservation_id = r.reservation_id
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*) FROM guests`;

    const [guestsResult, countResult] = await Promise.all([
      pool.query(guestsQuery, [limit, offset]),
      pool.query(countQuery),
    ]);

    const guests = guestsResult.rows.reduce((acc, row) => {
      const guest = acc.find((g) => g.guest_id === row.guest_id);
      const reservation = {
        reservation_id: row.reservation_id,
        primary_guest_id: row.primary_guest_id,
        check_in: row.check_in,
        check_out: row.check_out,
        room_numbers: row.room_numbers,
        total_amount: row.total_amount,
        guest_status: row.guest_status,
      };

      if (guest) {
        guest.reservations.push(reservation);
      } else {
        acc.push({
          guest_id: row.guest_id,
          tenant_id: row.tenant_id,
          first_name: row.first_name,
          last_name: row.last_name,
          date_of_birth: row.date_of_birth,
          nationality: row.nationality,
          address: row.address,
          identification_number: row.identification_number,
          email: row.email,
          phone_number: row.phone_number,
          emergency_contact: row.emergency_contact,
          vehicle: row.vehicle,
          created_date: row.created_date,
          updated_date: row.updated_date,
          reservations: row.reservation_id ? [reservation] : [],
          guest_status: row.guest_status,
        });
      }
      return acc;
    }, []);

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
    console.error("Error retrieving all guests and reservations:", err);
    res.status(500).json({ err: "Internal Server Error" });
  }
});

const getCurrentGuests = catchAsyncErrors(async (req, res, next) => {
  const { page = 1, limit = 10, sortKey = "created_date", sortDirection = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const sortColumn = sortKey;
  const sortOrder = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  console.log(req.query);

  try {
    const currentGuestsQuery = `
      SELECT g.*, r.*
      FROM guests g
      JOIN reservation_guests rg ON g.guest_id = rg.guest_id
      JOIN reservations r ON rg.reservation_id = r.reservation_id
      WHERE r.check_out > CURRENT_TIMESTAMP
      ORDER BY g.${sortColumn} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `
      SELECT COUNT(*)
      FROM guests g
      JOIN reservation_guests rg ON g.guest_id = rg.guest_id
      JOIN reservations r ON rg.reservation_id = r.reservation_id
      WHERE r.check_out > CURRENT_TIMESTAMP
    `;

    const [currentGuestRes, countRes] = await Promise.all([
      pool.query(currentGuestsQuery, [limit, offset]),
      pool.query(countQuery),
    ]);

    const currentGuests = currentGuestRes.rows;
    const totalCurrentGuests = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalCurrentGuests / limit);

    res.status(200).json({
      success: true,
      data: currentGuests,
      meta: {
        totalCurrentGuests,
        totalPages,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (error) {
    console.error("Error retrieving current guests and reservations:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

module.exports = { createGuest, getAllGuests, getCurrentGuests, searchGuest };
