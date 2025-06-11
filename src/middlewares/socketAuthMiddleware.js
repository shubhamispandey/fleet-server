// src/middlewares/socketAuthMiddleware.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import cookieParser from "cookie-parser"; // To parse cookies for Socket.IO

// Initialize cookie-parser middleware
const parseCookies = cookieParser(process.env.COOKIE_SECRET); // Use a secret for signed cookies if applicable
// Add COOKIE_SECRET to your .env if you use signed cookies
// COOKIE_SECRET=your_cookie_secret_key

const socketAuthMiddleware = async (socket, next) => {
  // Parse cookies from the handshake headers
  parseCookies(socket.request, socket.request.res, async (err) => {
    if (err) {
      console.error("Cookie parsing error for socket:", err);
      return next(new Error("Authentication error: Invalid cookies"));
    }

    const token = socket.request.cookies?.accessToken; // Get token from cookies

    if (!token) {
      console.warn(`Socket ${socket.id} connection denied: No token provided.`);
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        console.warn(
          `Socket ${socket.id} connection denied: User not found for token.`
        );
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user information to the socket object
      socket.userId = user._id.toString(); // Store as string for consistency
      socket.user = user; // Optionally attach full user object

      console.log(
        `⚡: MiddleWare    user ${socket.userId} connected with socket ID: ${socket.id}`
      );
      next(); // Allow connection
    } catch (error) {
      console.error(
        `Socket ${socket.id} authentication failed:`,
        error.message
      );
      return next(new Error("Authentication error: Invalid token"));
    }
  });
};

export default socketAuthMiddleware;
