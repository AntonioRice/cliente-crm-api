const axios = require("axios");
const mockData = require("./mockData");

const login = async () => {
  try {
    const response = await axios.post("http://localhost:3015/api/v1/login", {
      username: "",
      password: "",
    });
    return response.data.token;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

const createGuest = async (token, guest) => {
  try {
    const response = await axios.post("http://localhost:3015/api/v1/guests", guest, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.guest_id;
  } catch (error) {
    console.error("Error creating guest:", error);
    throw error;
  }
};

const createReservation = async (token, reservation) => {
  try {
    await axios.post("http://localhost:3015/api/v1/reservations", reservation, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
};

const main = async () => {
  try {
    const token = await login();
    console.log(token);
    for (const guest of mockData) {
      const guestId = await createGuest(token, guest);

      const reservation = {
        room_numbers: guest.room_numbers,
        check_in: guest.check_in,
        check_out: guest.check_out,
        payment_method: guest.payment_method,
        payment_status: guest.payment_status,
        total_amount: guest.total_amount,
        primary_guest_id: guestId,
      };

      await createReservation(token, reservation);
    }
    console.log("All mock data has been imported successfully.");
  } catch (error) {
    console.error("Error importing mock data:", error);
  }
};

main();
