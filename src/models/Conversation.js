// backend/models/Conversation.js

import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    name: {
      type: String,
      trim: true,
      // Required for group chats, optional for private
    },
    // Additional metadata for group chats can be added here
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Only applicable for group chats
    },
  },
  { timestamps: true }
);

// Index participants for efficient querying of conversations
ConversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", ConversationSchema);

export default Conversation;
