// backend/utils/socketUserMap.js

const userSocketMap = new Map(); // Stores userId -> Set<socketId>
const socketUserMap = new Map(); // Stores socketId -> userId

const socketUserMapUtils = {
  /**
   * Adds a user-socket mapping. A user can have multiple active sockets.
   * @param {string} userId
   * @param {string} socketId
   */
  addSocket(userId, socketId) {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socketId);
    socketUserMap.set(socketId, userId);
  },

  /**
   * Removes a socket mapping.
   * @param {string} socketId
   * @returns {string|undefined} The userId that was associated with the socket.
   */
  removeSocket(socketId) {
    const userId = socketUserMap.get(socketId);
    if (userId) {
      const sockets = userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
          userSocketMap.delete(userId); // Remove user if no active sockets
        }
      }
      socketUserMap.delete(socketId);
    }
    return userId;
  },

  /**
   * Gets all socket IDs for a given user ID.
   * @param {string} userId
   * @returns {Set<string>} A Set of socket IDs.
   */
  getSocketsByUserId(userId) {
    return userSocketMap.get(userId) || new Set();
  },

  /**
   * Gets the user ID for a given socket ID.
   * @param {string} socketId
   * @returns {string|undefined}
   */
  getUserIdBySocketId(socketId) {
    return socketUserMap.get(socketId);
  },

  /**
   * Checks if a user is currently online (has any active sockets).
   * @param {string} userId
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
  },

  /**
   * Gets all currently online user IDs.
   * @returns {Array<string>}
   */
  getAllOnlineUserIds() {
    return Array.from(userSocketMap.keys());
  },
};

export default socketUserMapUtils;
