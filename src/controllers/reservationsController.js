const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const moment = require("moment-timezone");

const createReservation = catchAsyncErrors(async (req, res, next) => {
  const { primary_guest_id, room_numbers, check_in, check_out, payment_method, total_amount, payment_status, additional_guests } = req.body;

  const tenant_id = req.body.tenant_id || req.user.tenant_id;

  try {
    const primaryGuestResult = await pool.query("SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2", [primary_guest_id, tenant_id]);

    if (primaryGuestResult.rows.length === 0) {
      return res.status(404).json({ message: "Primary guest not found" });
    }

    const primaryGuest = primaryGuestResult.rows[0];
    const primary_guest = JSON.stringify({
      first_name: primaryGuest.first_name,
      last_name: primaryGuest.last_name,
    });

    const guestStatus = calculateGuestStatus(check_out);

    const reservationResult = await pool.query(
      `
      INSERT INTO reservations 
      (tenant_id, primary_guest_id, check_in, check_out, room_numbers, payment_method, total_amount, payment_status, guest_status, primary_guest) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
      `,
      [tenant_id, primary_guest_id, check_in, check_out, `{${room_numbers}}`, payment_method, total_amount, payment_status, guestStatus, primary_guest]
    );

    const reservationId = reservationResult.rows[0].reservation_id;

    await pool.query("INSERT INTO reservation_guests (reservation_id, guest_id, tenant_id) VALUES ($1, $2, $3)", [reservationId, primary_guest_id, tenant_id]);

    if (additional_guests && additional_guests.length) {
      for (let guest of additional_guests) {
        let guestId = guest.guest_id;

        if (guestId) {
          const existingGuestResult = await pool.query("SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2", [guestId, tenant_id]);

          if (existingGuestResult.rows.length === 0) {
            guestId = null;
          }
        }

        if (!guestId && guest.identification_number) {
          const existingGuestResult = await pool.query("SELECT * FROM guests WHERE identification_number = $1 AND tenant_id = $2", [guest.identification_number, tenant_id]);

          if (existingGuestResult.rows.length > 0) {
            guestId = existingGuestResult.rows[0].guest_id;
          }
        }

        if (!guestId) {
          const newGuestResult = await pool.query(
            `
            INSERT INTO guests (tenant_id, first_name, last_name, date_of_birth, nationality, email, identification_number) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING guest_id
            `,
            [tenant_id, guest.first_name, guest.last_name, guest.date_of_birth, guest.nationality, guest.email, guest.identification_number]
          );
          guestId = newGuestResult.rows[0].guest_id;
        }

        await pool.query("INSERT INTO reservation_guests (reservation_id, guest_id, tenant_id) VALUES ($1, $2, $3)", [reservationId, guestId, tenant_id]);
      }
    }

    // Update the occupied status of the rooms
    await pool.query(`UPDATE rooms SET occupied = true WHERE number = ANY($1::int[])`, [room_numbers]);

    res.status(201).json({
      success: true,
      message: "Reservation successfully created",
      data: reservationResult.rows[0],
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

    const [reservationsResult, countResult] = await Promise.all([pool.query(reservationsQuery, [req.user.tenant_id, limit, offset]), pool.query(countQuery, [req.user.tenant_id])]);

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

const getReservationById = catchAsyncErrors(async (req, res, next) => {
  const reservation_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  try {
    const reservationsQuery = `
      SELECT r.*, 
             JSON_AGG(g.*) FILTER (WHERE g.guest_id IS NOT NULL AND g.guest_id != r.primary_guest_id) AS additional_guests
      FROM reservations r
      LEFT JOIN reservation_guests rg ON r.reservation_id = rg.reservation_id
      LEFT JOIN guests g ON rg.guest_id = g.guest_id
      WHERE r.reservation_id = $1 AND r.tenant_id = $2
      GROUP BY r.reservation_id
    `;
    const reservationsResponse = await pool.query(reservationsQuery, [reservation_id, tenant_id]);
    const reservation = reservationsResponse.rows[0];

    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to fetch guest reservation. Message: ${err.message}`, 500));
  }
});

const getReservationByGuestId = catchAsyncErrors(async (req, res, next) => {
  const primary_guest_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  try {
    const reservationsQuery = "SELECT * FROM reservations WHERE primary_guest_id = $1 AND tenant_id = $2 AND check_out > CURRENT_TIMESTAMP";
    const reservationsResponse = await pool.query(reservationsQuery, [primary_guest_id, tenant_id]);
    const reservations = reservationsResponse.rows[0];

    res.status(200).json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to fetch current guest reservations. Message: ${error.message}`, 500));
  }
});

const getReservationsAnalytics = catchAsyncErrors(async (req, res, next) => {
  const { sortBy = "check_in", order = "ASC", currentWeek } = req.query;

  try {
    const currentWeekMoment = moment(currentWeek, "YYYY-MM-DD").startOf("week").day(0);
    const twoWeeksPrior = currentWeekMoment.clone().subtract(1, "month").format("YYYY-MM-DD");
    const twoWeeksAfter = currentWeekMoment.clone().add(1, "month").endOf("week").format("YYYY-MM-DD");

    const reservationsQuery = ` 
    SELECT 
        r.*, 
        COUNT(rg.guest_id) AS total_guests
      FROM 
        reservations r
      LEFT JOIN 
        reservation_guests rg ON r.reservation_id = rg.reservation_id
      WHERE 
        r.tenant_id = $1 AND
        r.check_in >= $2 AND r.check_in <= $3
      GROUP BY 
        r.reservation_id
      ORDER BY 
        ${sortBy} ${order}
    `;
    const countQuery = `SELECT COUNT(*) FROM reservations WHERE tenant_id = $1 AND check_in >= $2 AND check_in <= $3`;

    const [reservationsResult, countResult] = await Promise.all([pool.query(reservationsQuery, [req.user.tenant_id, twoWeeksPrior, twoWeeksAfter]), pool.query(countQuery, [req.user.tenant_id, twoWeeksPrior, twoWeeksAfter])]);

    const reservations = reservationsResult.rows;
    const totalReservations = parseInt(countResult.rows[0].count, 10);
    const reservationsByWeek = {};

    reservations.forEach((reservation) => {
      const checkIn = moment(reservation.check_in).startOf("day");
      const checkOut = moment(reservation.check_out).startOf("day").set({ hour: 15, minute: 0, second: 0 });
      const totalGuests = parseInt(reservation.total_guests, 10);

      let currentDay = checkIn.clone();

      while (currentDay.isSameOrBefore(checkOut)) {
        const weekStart = currentDay.clone().startOf("week").day(0).toISOString().split("T")[0];

        if (!reservationsByWeek[weekStart]) {
          reservationsByWeek[weekStart] = {
            reservations: [],
            totalGuestsForWeek: 0,
          };
        }

        if (!reservationsByWeek[weekStart].reservations.some((res) => res.reservation_id === reservation.reservation_id)) {
          reservationsByWeek[weekStart].reservations.push(reservation);
          reservationsByWeek[weekStart].totalGuestsForWeek += totalGuests;
        }

        currentDay.add(1, "days");
      }
    });

    res.status(200).json({
      success: true,
      data: {
        reservations,
        reservationsByWeek,
      },
      meta: {
        totalReservations,
        totalGuestsForWeek: Object.keys(reservationsByWeek).reduce((acc, week) => {
          acc[week] = reservationsByWeek[week].totalGuestsForWeek;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to fetch reservations analytics. Message: ${err.message}`, 500));
  }
});

const getReservationsByMonth = catchAsyncErrors(async (req, res, next) => {
  const { month, year } = req.query;
  const tenant_id = req.user.tenant_id;

  try {
    const reservationsQuery = `
      SELECT r.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'guest_id', g.guest_id,
                 'first_name', g.first_name,
                 'last_name', g.last_name,
                 'date_of_birth', g.date_of_birth,
                 'nationality', g.nationality,
                 'identification_number', g.identification_number,
                 'email', g.email
               )
             ) FILTER (WHERE g.guest_id IS NOT NULL AND g.guest_id != r.primary_guest_id) AS additional_guests
      FROM reservations r
      LEFT JOIN reservation_guests rg ON r.reservation_id = rg.reservation_id
      LEFT JOIN guests g ON rg.guest_id = g.guest_id
      WHERE r.tenant_id = $1
      AND EXTRACT(MONTH FROM r.check_in) = $2
      AND EXTRACT(YEAR FROM r.check_in) = $3
      GROUP BY r.reservation_id
      ORDER BY r.check_in ASC
    `;
    const reservationsResponse = await pool.query(reservationsQuery, [tenant_id, month, year]);
    const reservations = reservationsResponse.rows;

    res.status(200).json({
      success: true,
      data: reservations,
    });
  } catch (err) {
    return next(new ErrorHandler(`Error: Unable to fetch reservations. Message: ${err.message}`, 500));
  }
});

const calculateGuestStatus = (check_out) => {
  const ecuadorTimeZone = "America/Guayaquil";
  const checkOutMoment = moment.tz(check_out, ecuadorTimeZone).set({ hour: 15, minute: 0, second: 0 });
  return moment().isBefore(checkOutMoment) ? "active" : "inactive";
};

module.exports = {
  createReservation,
  getReservations,
  getReservationById,
  getReservationByGuestId,
  getReservationsAnalytics,
  getReservationsByMonth,
};
