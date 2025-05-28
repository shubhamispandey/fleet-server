// backend/services/userService.js

import { responseFormat } from "../lib/helperFunctions.js";
import User from "../models/User.js";

const userService = {
  async getCurrentUser(userId) {
    try {
      // Get current user details by userId other than password
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return responseFormat({
          data: null,
          status: 404,
          message: "User not found",
        });
      }
      console.log("Current user fetched successfully:", user);
      return responseFormat({
        data: user,
        status: 200,
        message: "User fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      return responseFormat({
        data: null,
        status: 500,
        message: "Could not fetch user",
      });
    }
  },

  async getUserById(userId) {
    try {
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return { status: 404, message: "User not found" };
      }
      return { status: 200, data: user };
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return { status: 500, message: "Could not fetch user" };
    }
  },

  async getAllUsers() {
    try {
      const users = await User.find().select("-password");
      return { status: 200, data: users };
    } catch (error) {
      console.error("Error fetching all users:", error);
      return { status: 500, message: "Could not fetch users" };
    }
  },

  async updateUser(userId, updateData) {
    try {
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      }).select("-password");
      if (!updatedUser) {
        return { status: 404, message: "User not found" };
      }
      return {
        status: 200,
        message: "User updated successfully",
        data: updatedUser,
      };
    } catch (error) {
      console.error("Error updating user:", error);
      return { status: 500, message: "Could not update user" };
    }
  },

  async searchUsers(query) {
    try {
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      }).select("-password");
      return { status: 200, data: users };
    } catch (error) {
      console.error("Error searching users:", error);
      return { status: 500, message: "Could not search users" };
    }
  },
};

export default userService;
