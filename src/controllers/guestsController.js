const pool = require("../database/db");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const moment = require("moment-timezone");

const createGuest = catchAsyncErrors(async (req, res, next) => {
  const {
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
    guests,
  } = req.body;

  const tenant_id = req.body.tenant_id || req.user.tenant_id;

  const findGuestQuery = `SELECT * FROM guests WHERE email = $1 AND tenant_id = $2`;
  const guestInsertQuery = `
      INSERT INTO guests 
      (tenant_id, first_name, last_name, date_of_birth, nationality, address,
      identification_number, email, phone_number, emergency_contact, vehicle) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`;
  const guestUpdateQuery = `
      UPDATE guests 
      SET first_name = $1, last_name = $2, date_of_birth = $3, nationality = $4, 
          address = $5, identification_number = $6, phone_number = $7, 
          emergency_contact = $8, vehicle = $9, updated_date = NOW() 
      WHERE email = $10 AND tenant_id = $11 
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

  try {
    // Check if primary guest exists
    const existingGuest = await pool.query(findGuestQuery, [email, tenant_id]);

    let guestId;
    let guestData;
    if (existingGuest.rows.length > 0) {
      const updatedGuest = await pool.query(guestUpdateQuery, [
        first_name,
        last_name,
        date_of_birth,
        nationality,
        addressJson,
        identification_number,
        phone_number,
        emergencyContactJson,
        vehicleJson,
        email,
        tenant_id,
      ]);
      guestId = updatedGuest.rows[0].guest_id;
      guestData = updatedGuest.rows[0];
    } else {
      const newGuest = await pool.query(guestInsertQuery, [
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
      ]);
      guestId = newGuest.rows[0].guest_id;
      guestData = newGuest.rows[0];
    }

    // Calculate guest_status
    const ecuadorTimeZone = "America/Guayaquil";
    const checkOutMoment = moment.tz(check_out, ecuadorTimeZone).set({ hour: 15, minute: 0, second: 0 });
    const guestStatus = moment().isBefore(checkOutMoment) ? "active" : "inactive";

    // Check if a new reservation is needed
    const existingReservation = await pool.query(
      "SELECT * FROM reservations WHERE primary_guest_id = $1 AND tenant_id = $2",
      [guestId, tenant_id]
    );

    if (
      existingReservation.rows.length === 0 ||
      JSON.stringify(existingReservation.rows[0].room_numbers) !== JSON.stringify(room_numbers) ||
      existingReservation.rows[0].check_in !== check_in ||
      existingReservation.rows[0].check_out !== check_out
    ) {
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

      // Link primary guest to reservation
      await pool.query(reservationGuestQuery, [reservationId, guestId, tenant_id]);

      // Link additional guests to reservation
      for (let guest of guests) {
        const { first_name, last_name, date_of_birth, email, identification_number } = guest;

        let additionalGuestId;
        const existingAdditionalGuest = await pool.query(findGuestQuery, [email, tenant_id]);
        if (existingAdditionalGuest.rows.length > 0) {
          additionalGuestId = existingAdditionalGuest.rows[0].guest_id;
        } else {
          const newAdditionalGuest = await pool.query(guestInsertQuery, [
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
          ]);
          additionalGuestId = newAdditionalGuest.rows[0].guest_id;
        }

        await pool.query(reservationGuestQuery, [reservationId, additionalGuestId, tenant_id]);
      }

      res.status(201).json({
        success: true,
        message: `Guest: ${guestId}, for tenant: ${tenant_id}, successfully created/updated and linked to reservation: ${reservationId}`,
        data: guestData,
      });
      console.log(201, "created");
    } else {
      res.status(200).json({
        success: true,
        message: `Guest: ${guestId}, for tenant: ${tenant_id}, successfully updated`,
        data: guestData,
      });
    }
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to create/update guest and reservation. Message: ${err.message}`, 500));
  }
});

const getGuestById = catchAsyncErrors(async (req, res, next) => {
  const guest_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  try {
    const guestQuery = "SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2";
    // const reservationsQuery =
    //   "SELECT * FROM reservations WHERE guest_id = $1 AND tenant_id = $2 AND check_out > CURRENT_TIMESTAMP";

    const guestResponse = await pool.query(guestQuery, [guest_id, tenant_id]);
    // const reservationsResponse = await pool.query(reservationsQuery, [guest_id, tenant_id]);

    const guest = guestResponse.rows[0];
    // const reservations = reservationsResponse.rows;

    console.log(guest);

    res.status(200).json({
      success: true,
      data: {
        guest,
        //  reservations
      },
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(`Error: Unable to fetch guest reservations. Message: ${err.message}`, 500));
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

  try {
    const currentGuestsQuery = `
      SELECT g.*, r.*
      FROM guests g
      JOIN (
        SELECT DISTINCT ON (rg.guest_id) rg.guest_id, r.*
        FROM reservation_guests rg
        JOIN reservations r ON rg.reservation_id = r.reservation_id
        WHERE r.check_out > CURRENT_TIMESTAMP
        ORDER BY rg.guest_id, r.${sortColumn} ${sortOrder}
      ) r ON g.guest_id = r.guest_id
      ORDER BY g.${sortColumn} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT g.guest_id)
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

const deleteGuest = catchAsyncErrors(async (req, res, next) => {
  const guest_id = req.params.id;
  const tenant_id = req.user.tenant_id;

  console.log("guest_id", guest_id);
  console.log("tenant_id", tenant_id);

  const findGuestQuery = `SELECT * FROM guests WHERE guest_id = $1 AND tenant_id = $2`;
  const deleteGuestQuery = `DELETE FROM guests WHERE guest_id = $1 AND tenant_id = $2`;
  const deleteReservationGuestQuery = `DELETE FROM reservation_guests WHERE guest_id = $1 AND tenant_id = $2`;

  try {
    // Check if the guest exists
    const existingGuest = await pool.query(findGuestQuery, [guest_id, tenant_id]);

    if (existingGuest.rows.length === 0) {
      return next(new ErrorHandler("Guest not found", 404));
    }

    // Begin transaction
    await pool.query("BEGIN");

    // Delete from reservation_guests table first to maintain integrity
    await pool.query(deleteReservationGuestQuery, [guest_id, tenant_id]);

    // Delete from guests table
    await pool.query(deleteGuestQuery, [guest_id, tenant_id]);

    // Commit transaction
    await pool.query("COMMIT");

    res.status(200).json({
      success: true,
      message: `Guest with ID: ${guest_id} successfully deleted and reservation retained`,
    });
  } catch (err) {
    // Rollback transaction in case of error
    await pool.query("ROLLBACK");
    console.log(err);
    return next(new ErrorHandler(`Error: Unable to delete guest. Message: ${err.message}`, 500));
  }
});

module.exports = { createGuest, getGuestById, getAllGuests, getCurrentGuests, searchGuest, deleteGuest };
