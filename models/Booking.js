const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  currentDate: {
    type: Date,
    default: Date.now, // Automatically sets the current date and time
  },

});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
