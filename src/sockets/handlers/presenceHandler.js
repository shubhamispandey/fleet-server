// backend/sockets/handlers/presenceHandler.js

import User from "../../models/User.js";
import SOCKET_EVENTS from "../../utils/socketEvents.js";
import socketUserMap from "../../utils/socketUserMap.js";

const presenceHandler = (io, socket) => {
  const handleConnection = async () => {
    const userId = socket.userId; // userId is attached by socketAuthMiddleware
    const socketId = socket.id;

    socketUserMap.addSocket(userId, socketId);

    // Update user status in DB
    await User.findByIdAndUpdate(userId, {
      status: "online",
      lastActive: new Date(),
    });

    // Emit to all connected clients that this user is online
    // We use io.emit to broadcast to everyone, including potentially other sockets of the same user,
    // which is generally desired for presence updates.
    io.emit(SOCKET_EVENTS.USER_ONLINE, { userId, status: "online" });
  };

  // --- DISCONNECT LOGIC ---
  // This function contains the logic to run when a socket disconnects
  const handleDisconnect = async () => {
    const userId = socketUserMap.removeSocket(socket.id);

    if (userId) {
      // Only update status to offline if no other active sockets for this user
      if (!socketUserMap.isUserOnline(userId)) {
        await User.findByIdAndUpdate(userId, {
          status: "offline",
          lastActive: new Date(),
        });
        io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId, status: "offline" });
        console.log(
          `❌: User ${userId} (${socket.id}) disconnected and is now offline.`
        );
      } else {
        console.log(
          `❌: Socket ${socket.id} disconnected for user ${userId}, but user is still online.`
        );
      }
    } else {
      console.log(`❌: Socket ${socket.id} disconnected (no associated user).`);
    }
  };

  // Register listeners for this specific socket
  handleConnection();
  socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
};

export default presenceHandler;
