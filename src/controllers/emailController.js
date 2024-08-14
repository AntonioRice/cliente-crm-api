const dotenv = require("dotenv").config();
const aws = require("aws-sdk");
const ErrorHandler = require("../utils/errorHandler");

const SESConfig = {
  region: "us-east-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  apiVersion: "2010-12-01",
};

aws.config.update(SESConfig);
const ses = new aws.SES();

const handleSendEmail = async (email, resetUrl) => {
  try {
    const params = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Data: `You requested a password reset. Please make a PUT request to: \n\n ${resetUrl}`,
          },
        },
        Subject: {
          Data: "Password Reset Request",
        },
      },
    };

    await ses.sendEmail(params).promise();
    console.log("Password reset email sent successfully");
  } catch (err) {
    console.error("Error sending password reset email:", err);
    throw new ErrorHandler("Error sending email. Please try again later.", 500);
  }
};

module.exports = { handleSendEmail };
