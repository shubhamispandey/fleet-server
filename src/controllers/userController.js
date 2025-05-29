import userService from "../services/userService.js";
import { responseFormat } from "../lib/helperFunctions.js";
import jwt from "jsonwebtoken";

export const getCurrentUser = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res
        .status(401)
        .json(responseFormat({ message: "Unauthorized", status: 401 }));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const result = await userService.getCurrentUser(userId);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get Current User error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from the route parameters
    const result = await userService.getUserById(userId);
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Get User by ID error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await userService.getAllUsers();
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Get All Users error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    const result = await userService.updateUser(userId, updateData);
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Update User error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    const result = await userService.searchUsers(query);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Search Users error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};
