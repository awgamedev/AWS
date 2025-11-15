const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      // Für die Autorisierung (z.B. 'user', 'admin')
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
  },
  { timestamps: true }
); // Fügt createdAt und updatedAt hinzu

module.exports = mongoose.model("User", UserSchema);
