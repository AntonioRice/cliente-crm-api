const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const moment = require("moment-timezone");

const createReservation = catchAsyncErrors(async (req, res, next) => {
  const { primary_guest_id, room_numbers, check_in, check_out, payment_method, total_amount, payment_status, guests } =
    req.body;

  const tenant_id = req.body.tenant_id || req.user.tenant_id;

  try {
    const primaryGuest = await pool.query("SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2", [
      primary_guest_id,
      tenant_id,
    ]);

    if (primaryGuest.rows.length === 0) {
      return res.status(404).json({ message: "Primary guest not found" });
    }

    const primary_guest = JSON.stringify({
      first_name: primaryGuest.rows[0].first_name,
      last_name: primaryGuest.rows[0].last_name,
    });
    const guestStatus = calculateGuestStatus(check_out);

    const reservation = await pool.query(
      `
      INSERT INTO reservations 
      (tenant_id, primary_guest_id, check_in, check_out, room_numbers, payment_method, total_amount, payment_status, guest_status, primary_guest) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        tenant_id,
        primary_guest_id,
        check_in,
        check_out,
        `{${room_numbers}}`,
        payment_method,
        total_amount,
        payment_status,
        guestStatus,
        primary_guest,
      ]
    );

    const reservationId = reservation.rows[0].reservation_id;

    await pool.query("INSERT INTO reservation_guests (reservation_id, guest_id, tenant_id) VALUES ($1, $2, $3)", [
      reservationId,
      primary_guest_id,
      tenant_id,
    ]);

    for (let guest of guests) {
      const { guest_id } = guest;

      const existingGuest = await pool.query("SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2", [
        guest_id,
        tenant_id,
      ]);
      if (existingGuest.rows.length > 0) {
        await pool.query("INSERT INTO reservation_guests (reservation_id, guest_id, tenant_id) VALUES ($1, $2, $3)", [
          reservationId,
          guest_id,
          tenant_id,
        ]);
      } else {
        return res.status(404).json({ message: `Guest with ID ${guest_id} not found` });
      }
    }

    res.status(201).json({
      success: true,
      message: "Reservation successfully created",
      data: reservation.rows[0],
    });
  } catch (err) {
    console.log(err);
    next(new ErrorHandler(`Error: Unable to create reservation. Message: ${err.message}`, 500));
  }
});

const getReservations = catchAsyncErrors(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const reservationsQuery = `
        SELECT * FROM reservations
        WHERE tenant_id = $1
        LIMIT $2 OFFSET $3
        `;
    const countQuery = `SELECT COUNT(*) FROM reservations
    WHERE tenant_id = $1`;

    const [reservationsResult, countResult] = await Promise.all([
      pool.query(reservationsQuery, [req.user.tenant_id, limit, offset]),
      pool.query(countQuery, [req.user.tenant_id]),
    ]);

    const reservations = reservationsResult.rows;
    const totalReservations = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalReservations / limit);

    res.status(200).json({
      success: true,
      data: reservations,
      meta: {
        totalReservations,
        totalPages,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to fetch reservations. Message: ${err}`, 500));
  }
});

const getReservationsById = catchAsyncErrors(async (req, res, next) => {
  const guest_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  try {
    const guestQuery = "SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2";
    const reservationsQuery =
      "SELECT * FROM reservations WHERE guest_id = $1 AND tenant_id = $2 AND check_out > CURRENT_TIMESTAMP";

    const guestResponse = await pool.query(guestQuery, [guest_id, tenant_id]);
    const reservationsResponse = await pool.query(reservationsQuery, [guest_id, tenant_id]);

    const guest = guestResponse.rows[0];
    const reservations = reservationsResponse.rows;

    res.status(200).json({
      success: true,
      data: { guest, reservations },
    });
  } catch (error) {
    return next(new ErrorHandler(`Error: Unable to fetch guest reservations. Message: ${err.message}`, 500));
  }
});

const getReservationsAnalytics = catchAsyncErrors(async (req, res, next) => {
  const { sortBy = "check_in", order = "ASC" } = req.query;

  try {
    const reservationsQuery = `
      SELECT *, 
      DATE_TRUNC('week', check_in) AS week_start 
      FROM reservations
      WHERE tenant_id = $1
      ORDER BY ${sortBy} ${order}
    `;
    const countQuery = `SELECT COUNT(*) FROM reservations WHERE tenant_id = $1`;

    const [reservationsResult, countResult] = await Promise.all([
      pool.query(reservationsQuery, [req.user.tenant_id]),
      pool.query(countQuery, [req.user.tenant_id]),
    ]);

    const reservations = reservationsResult.rows;
    const totalReservations = parseInt(countResult.rows[0].count, 10);

    // Group reservations by week
    const reservationsByWeek = reservations.reduce((acc, reservation) => {
      const weekStart = reservation.week_start.toISOString().split("T")[0];
      if (!acc[weekStart]) {
        acc[weekStart] = [];
      }
      acc[weekStart].push(reservation);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        reservations,
        reservationsByWeek,
      },
      meta: {
        totalReservations,
      },
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to fetch reservations analytics. Message: ${err.message}`, 500));
  }
});

const calculateGuestStatus = (check_out) => {
  const ecuadorTimeZone = "America/Guayaquil";
  const checkOutMoment = moment.tz(check_out, ecuadorTimeZone).set({ hour: 15, minute: 0, second: 0 });
  return moment().isBefore(checkOutMoment) ? "active" : "inactive";
};

module.exports = { createReservation, getReservations, getReservationsById, getReservationsAnalytics };
