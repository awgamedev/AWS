const mongoose = require("mongoose");

// Define the schema for our simple message
const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create and export the model
module.exports = mongoose.model("Message", messageSchema);
