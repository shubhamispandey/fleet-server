import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: "default_avatar.jpg",
    trim: true,
  },
  status: {
    type: String,
    enum: ["online", "offline"],
    default: "offline",
  },
  // timezone india (IST)
  lastActive: {
    type: Date,
    default: () => {
      // Set default to current time in IST (UTC+5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(
        now.getTime() + istOffset - now.getTimezoneOffset() * 60000
      );
    },
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: () => {
      // Set default to current time in IST (UTC+5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(
        now.getTime() + istOffset - now.getTimezoneOffset() * 60000
      );
    },
  },
  country: {
    type: String,
    default: "India",
  },
  phone: {
    type: String,
    trim: true,
  },
});

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
