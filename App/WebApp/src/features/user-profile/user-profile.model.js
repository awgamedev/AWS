const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  profilePictureBase64: {
    type: String,
    default: null,
  },
  pauseInMinutesPerDay: {
    type: Number,
    default: null,
  },
  vacationDaysPerYear: {
    type: Number,
    required: true,
    default: 20,
  },
  sickDaysPerYear: {
    type: Number,
    required: true,
    default: 10,
  },
});

module.exports = mongoose.model("UserProfile", UserProfileSchema);
