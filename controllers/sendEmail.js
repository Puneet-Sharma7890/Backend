const nodemailer = require('nodemailer');
const OTP = require('otp-generator');

const sendMail = async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service:'Gmail',
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "puneetsharmap86@gmail.com",
        pass: "ijrr qoid vkgu abil",
      },
    });


    // Generate a random OTP
    const otp = OTP.generate(6, { alphabets: false, upperCase: false, specialChars: false });

    const info = await transporter.sendMail({
      from: 'puneetsharmap86@gmail.com',
      to: 'puneetsharmap86@gmail.com',
      subject: "Hello ✔",
      html: `<b>Your OTP for Chardham tour and travel is ${otp}</b>`,
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    res.send("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Failed to send email");
  }
};

module.exports = sendMail;