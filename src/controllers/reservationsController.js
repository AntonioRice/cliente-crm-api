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
        `;
    const countQuery = `SELECT COUNT(*) FROM reservations`;

    const [reservationsResult, countResult] = await Promise.all([
      pool.query(reservationsQuery, [limit, offset]),
      pool.query(countQuery),
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
    return next(new ErrorHandler(`Error: Unable to fetch reservations. Message: ${err.message}`, 500));
  }
});

module.exports = { getReservations };
