const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // Stellen Sie sicher, dass der Benutzername eindeutig ist
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Stellen Sie sicher, dass die E-Mail-Adresse eindeutig ist
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
