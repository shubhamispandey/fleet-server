// index.js (formerly server.js)

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import connectDatabase from "./src/lib/connectDB.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import rateLimiter from "./src/middlewares/rateLimiter.js";
import initializeSocketIO from "./src/sockets/index.js";
import startServer from "./src/lib/server.js";

// ENVIRONMENT VARIABLES
dotenv.config();
const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;

// CORS POLICY
const corsOption = {
  origin: process.env.FRONTEND_HOST,
  credentials: true,
  optionsSuccessStatus: 200,
};

const app = express();
const server = http.createServer(app);

// Create the Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// MIDDLEWARES
app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser()); // Make sure cookieParser is used before routes if you rely on cookies for auth

// ROUTES
app.use("/api/auth", authRoutes);
// app.use("/api/meet", meetRoutes); // Temporarily commented out as per your request scope
app.use("/api/users", userRoutes);

// Start the server
startServer(server, async () => {
  await connectDatabase(DATABASE_URL);
  initializeSocketIO(io);
  app.use(rateLimiter);
});
