require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("./models/user.model");
const nodemailer = require("nodemailer");
const OTP = require("otp-generator");
const session = require("express-session");
const axios = require("axios").default;
const Contact = require("./models/Contact.model");
const Booking = require("./models/Booking");

const app = express();
const PORT = process.env.PORT||8001;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 },
  })
);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

let savedTotalPrice = 0; 
let tempUserEmail = null;


// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, recaptcha } = req.body;
    const { data } = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptcha}`);
    if (data.success) {
      await User.create({ name, email, password, recaptcha });
      tempUserEmail = email;
      req.session.user = { name, email };
      res.json({ status: "ok", register: req.session.user });
      console.log(recaptcha)
    } else {
      console.log('failed')
      res.json({ status: "error", error: "reCAPTCHA verification failed", errorCodes: data["error-codes"] });
    }
  } catch (err) {
    console.error("Error during registration:", err);
    res.json({ status: "error", error: "User is already registered with this email id" });
  }
});

// Login endpoint
let token = ''
app.post("/api/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (user) {
       token = jwt.sign({ name: user.name, email: user.email, id:user._id }, process.env.JWT_SECRET, { expiresIn: '1m' });
      console.log('token is:',token) 
      tempUserEmail = user.email;
      req.session.user = user.email;
      res.json({ status: "ok", user: token , login: req.session.user });
      console.log('fine')
    } else {
      res.json({ status: "error", user: false });
      console.log('error')
    }
  } catch (err) {
    console.error("Login error:", err);
    res.json({ status: "error", user: false });
  }
});

// Checkout API
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { tour } = req.body;
    savedTotalPrice = tour.totalPrice;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "inr",
          product_data: { name: tour.name, description: tour.description },
          unit_amount: tour.totalPrice * 100,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `http://localhost:3000/Success?email=${encodeURIComponent(tempUserEmail)}`,
      cancel_url: "http://localhost:3000/cancel",
    });

    if (tempUserEmail) {
      const currentDate = new Date();
      const booking = new Booking({ email: tempUserEmail, currentDate });
      await booking.save();
    }
    
    res.json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Send email API
app.post("/api/send-email", async (req, res) => {
  const { email } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const otp = OTP.generate(6, { alphabets: false, upperCase: false, specialChars: false });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: `<b>Your OTP for Chardham tour and travel is ${otp}</b>`,
    });
    console.log(otp)
    res.json({ status: "ok", message: "Email sent successfully", otp });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ status: "error", message: "Failed to send email" });
  }
});


// Contact API
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const contact = new Contact({ name, email, subject, message });
    await contact.save();
    res.json({ status: "ok", message: "Contact information saved successfully" });
  } catch (err) {
    console.error("Error saving contact information:", err);
    res.status(500).json({ status: "error", message: "Failed to save contact information" });
  }
});

// Endpoint to get the saved total price
app.get("/api/totalprice", (req, res) => {
  res.json({ totalprice: savedTotalPrice });
});

// Get booking details
app.get("/api/getbooking", async (req, res) => {
  try {
    const bookingDetails = await Booking.find();
    if (bookingDetails.length > 0) {
      res.status(200).json(bookingDetails);
    } else {
      res.status(404).json({ message: "No booking details found." });
    }
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


//get users
// Get all users
app.get("/api/usersdetails", async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users from the database
    res.status(200).json(users); // Send the users as a response
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});
//get booking details
app.get("/api/bookingdetails", async (req, res) => {
  try {
    const users = await Booking.find(); // Fetch all users from the database
    res.status(200).json(users); // Send the users as a response
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});
//get contact details
app.get("/api/contactdetails", async (req, res) => {
  try {
    const users = await Contact.find(); // Fetch all users from the database
    res.status(200).json(users); // Send the users as a response
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});
 