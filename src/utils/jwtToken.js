const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign({ tenant: user.tenant_id, id: user.user_id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION_TIME,
  });
};

const sendToken = (user, statusCode, res) => {
  const token = generateToken(user);
  const options = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRATION_TIME * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};

module.exports = sendToken;
