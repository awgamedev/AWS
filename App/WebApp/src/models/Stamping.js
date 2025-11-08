const mongoose = require("mongoose");

// Define the schema for our simple stamping
const stampingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stampingType: {
    type: String,
    enum: ["in", "out"],
    required: true,
  },
  stampingReason: {
    type: String,
    // Feste, vorgegebene Auswahlmöglichkeiten für den Grund
    enum: ["Kühe melken", "Feldarbeit", "Büroarbeit"],
    // Wir machen es nicht required: true, da es bei "out" nicht benötigt wird.
    // Die Logik, wann es benötigt wird, behandeln wir im POST-Handler.
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Create and export the model
module.exports = mongoose.model("Stamping", stampingSchema);
