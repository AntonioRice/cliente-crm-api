const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const createGuest = catchAsyncErrors(async (req, res, next) => {
  const { first_name, last_name, date_of_birth, nationality, address, identification_number, email, phone_number, emergency_contact, vehicle } = req.body;

  const tenant_id = req.body.tenant_id || req.user.tenant_id;

  const guestData = {
    tenant_id,
    first_name,
    last_name,
    date_of_birth,
    nationality,
    address: JSON.stringify(address),
    identification_number,
    email,
    phone_number,
    emergency_contact: JSON.stringify(emergency_contact),
    vehicle: JSON.stringify(vehicle),
  };

  try {
    const existingGuest = await pool.query("SELECT * FROM guests WHERE email = $1 AND tenant_id = $2", [email, tenant_id]);

    let guest;
    if (existingGuest.rows.length > 0) {
      guest = await pool.query(
        `
        UPDATE guests 
        SET first_name = $1, last_name = $2, date_of_birth = $3, nationality = $4, 
            address = $5, identification_number = $6, phone_number = $7, 
            emergency_contact = $8, vehicle = $9, updated_date = NOW() 
        WHERE email = $10 AND tenant_id = $11 
        RETURNING *`,
        [first_name, last_name, date_of_birth, nationality, guestData.address, identification_number, phone_number, guestData.emergency_contact, guestData.vehicle, email, tenant_id]
      );
    } else {
      guest = await pool.query(
        `
        INSERT INTO guests 
        (tenant_id, first_name, last_name, date_of_birth, nationality, address, 
        identification_number, email, phone_number, emergency_contact, vehicle) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [tenant_id, first_name, last_name, date_of_birth, nationality, guestData.address, identification_number, email, phone_number, guestData.emergency_contact, guestData.vehicle]
      );
    }

    res.status(201).json({
      success: true,
      message: "Guest successfully created/updated",
      data: guest.rows[0],
    });
  } catch (err) {
    console.log(err);
    next(new ErrorHandler(`Error: Unable to create/update guest. Message: ${err.message}`, 500));
  }
});

const getGuestById = catchAsyncErrors(async (req, res, next) => {
  const guest_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  try {
    const guestQuery = "SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2";
    const guestResponse = await pool.query(guestQuery, [guest_id, tenant_id]);
    const guest = guestResponse.rows[0];

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found",
      });
    }

    res.status(200).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to fetch guest. Message: ${error.message}`, 500));
  }
});

const getAllGuests = catchAsyncErrors(async (req, res, next) => {
  const { page = 1, limit = 10, sortKey = "created_date", sortDirection = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const sortColumn = sortKey;
  const sortOrder = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  try {
    const guestsQuery = `
      SELECT g.*, 
             COALESCE(r.reservation_id, NULL) AS reservation_id, 
             COALESCE(r.check_in, NULL) AS check_in, 
             COALESCE(r.check_out, NULL) AS check_out, 
             COALESCE(r.guest_status, NULL) AS guest_status
      FROM guests g
      LEFT JOIN (
        SELECT DISTINCT ON (rg.guest_id) 
               rg.guest_id, 
               r.reservation_id, 
               r.check_in, 
               r.check_out, 
               r.guest_status
        FROM reservation_guests rg
        LEFT JOIN reservations r ON rg.reservation_id = r.reservation_id
        ORDER BY rg.guest_id, r.${sortColumn} ${sortOrder}
      ) r ON g.guest_id = r.guest_id
      ORDER BY g.${sortColumn} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) FROM guests`;

    const [guestsResult, countResult] = await Promise.all([pool.query(guestsQuery, [limit, offset]), pool.query(countQuery)]);

    const totalGuests = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalGuests / limit);

    res.status(200).json({
      success: true,
      data: guestsResult.rows,
      meta: {
        totalGuests,
        totalPages,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error("Error retrieving all guests and reservations:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getCurrentGuests = catchAsyncErrors(async (req, res, next) => {
  const { page = 1, limit = 10, sortKey = "created_date", sortDirection = "DESC" } = req.query;
  const offset = (page - 1) * limit;
  const sortColumn = sortKey;
  const sortOrder = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  try {
    const currentGuestsQuery = `
      SELECT g.*, r.*
      FROM guests g
      JOIN (
        SELECT DISTINCT ON (rg.guest_id) rg.guest_id, r.*
        FROM reservation_guests rg
        JOIN reservations r ON rg.reservation_id = r.reservation_id
        WHERE r.guest_status = $1
        AND (r.check_out + INTERVAL '15 hours') > NOW()  -- Check if checkout time + 15 hours (i.e., 3 PM) is after current time
        ORDER BY rg.guest_id, r.${sortColumn} ${sortOrder}
      ) r ON g.guest_id = r.guest_id
      ORDER BY g.${sortColumn} ${sortOrder}
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT g.guest_id)
      FROM guests g
      JOIN reservation_guests rg ON g.guest_id = rg.guest_id
      JOIN reservations r ON rg.reservation_id = r.reservation_id
      WHERE r.guest_status = $1
      AND (r.check_out + INTERVAL '15 hours') > NOW()  -- Check if checkout time + 15 hours (i.e., 3 PM) is after current time
    `;

    const [currentGuestRes, countRes] = await Promise.all([pool.query(currentGuestsQuery, ["active", limit, offset]), pool.query(countQuery, ["active"])]);

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

const searchGuests = catchAsyncErrors(async (req, res, next) => {
  const { searchQuery, limit = 10, offset = 0 } = req.query;
  if (!searchQuery) {
    return next(new ErrorHandler("Search query is required", 400));
  }

  const tenant_id = req.user.tenant_id;

  const query = `
    SELECT * from guests
    WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
    AND tenant_id = $2
    ORDER BY first_name DESC
    LIMIT $3 OFFSET $4
  `;

  try {
    const values = [`%${searchQuery}%`, tenant_id, limit, offset];
    const results = await pool.query(query, values);
    res.status(200).json({
      success: true,
      data: results.rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

const deleteGuest = catchAsyncErrors(async (req, res, next) => {
  const guest_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  const findGuestQuery = `SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2`;
  const deleteGuestQuery = `DELETE FROM guests WHERE guest_id = $1 AND tenant_id = $2`;
  const deleteReservationGuestQuery = `DELETE FROM reservation_guests WHERE guest_id = $1 AND tenant_id = $2`;

  try {
    const existingGuest = await pool.query(findGuestQuery, [guest_id, tenant_id]);

    if (existingGuest.rows.length === 0) {
      return next(new ErrorHandler("Guest not found", 404));
    }

    await pool.query("BEGIN");

    await pool.query(deleteReservationGuestQuery, [guest_id, tenant_id]);

    await pool.query(deleteGuestQuery, [guest_id, tenant_id]);

    await pool.query("COMMIT");

    res.status(200).json({
      success: true,
      message: `Guest with ID: ${guest_id} successfully deleted and reservation retained`,
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to delete guest. Message: ${err.message}`, 500));
  }
});

module.exports = { createGuest, getGuestById, getAllGuests, getCurrentGuests, searchGuests, deleteGuest };
