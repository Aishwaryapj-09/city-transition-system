const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    default: ""
  },

  area: {
    type: String,
    default: ""
  },

  rent: {
    type: Number,
    required: true
  },

 type: {
  type: String,
  enum: ["PG", "Hostel", "Apartment", "Hotel"], // ✅ ADD HOTEL
  required: true
},

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },

  isVerified: {
    type: Boolean,
    default: false
  }

},{timestamps:true});

listingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Listing", listingSchema);