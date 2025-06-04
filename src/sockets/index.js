// backend/sockets/index.js

import socketAuthMiddleware from "../middlewares/socketAuthMiddleware.js";
import presenceHandler from "./handlers/presenceHandler.js";
import chatHandler from "./handlers/chatHandler.js";
import SOCKET_EVENTS from "../utils/socketEvents.js";

// This function will be called from your main server file (index.js)
const initializeSocketIO = (io) => {
  // Apply authentication middleware to all incoming Socket.IO connections
  io.use(socketAuthMiddleware);

  // Handle authenticated connections
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log(
      `⚡: Authenticated user ${socket.userId} connected with socket ID: ${socket.id}`
    );

    // Register all event handlers for this socket
    presenceHandler(io, socket);
    chatHandler(io, socket);

    // You can add more handlers here for other features (e.g., meetingHandler)
    // For example:
    // meetingHandler(io, socket);

    // General error handling for the socket
    socket.on(SOCKET_EVENTS.ERROR, (err) => {
      console.error(`Socket error for ${socket.id}:`, err);
    });
  });

  console.log("4. Socket: server initialized with authentication middleware.");
};

export default initializeSocketIO;
