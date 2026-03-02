const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  area: { type: String, required: true },
  city: { type: String, required: true },
  rent: { type: Number, required: true },
  type: {
    type: String,
    enum: ["PG", "Apartment", "Hostel", "Hotel", "Independent House"],
    required: true
  },
  lat: Number,
  lng: Number,
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Listing", listingSchema);