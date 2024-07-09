const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

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

module.exports = { getReservations, getReservationsById, getReservationsAnalytics };
