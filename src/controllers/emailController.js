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

const handleSendEmail = async (email, subject, messageBody) => {
  try {
    const params = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Data: messageBody,
          },
        },
        Subject: {
          Data: subject,
        },
      },
    };

    await ses.sendEmail(params).promise();
    console.log(`${subject} email sent successfully`);
  } catch (err) {
    console.error(`Error sending ${subject} email:`, err);
    throw new ErrorHandler(`Error sending email. Please try again later.`, 500);
  }
};

module.exports = { handleSendEmail };
