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
    await axios.post("http://localhost:3015/api/v1/guests", guest, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Error creating guest:", error);
    throw error;
  }
};

const main = async () => {
  try {
    const token = await login();
    for (const guest of mockData) {
      await createGuest(token, guest);
    }
    console.log("All mock data has been imported successfully.");
  } catch (error) {
    console.error("Error importing mock data:", error);
  }
};

main();
