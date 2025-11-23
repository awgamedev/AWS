const mongoose = require("mongoose");

/**
 * Chat Schema - Represents a chat room (group or direct message)
 */
const ChatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["group", "direct"],
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for faster queries
ChatSchema.index({ participants: 1 });
ChatSchema.index({ type: 1 });

module.exports = mongoose.model("Chat", ChatSchema);
