// backend/sockets/handlers/chatHandler.js

import chatService from "../../services/chatService.js";
import socketUserMap from "../../utils/socketUserMap.js";
import Conversation from "../../models/Conversation.js"; // To check conversation type
import SOCKET_EVENTS from "../../utils/socketEvents.js";

const chatHandler = (io, socket) => {
  /**
   * Handles sending a private message from one user to another.
   * @param {object} data - { receiverId: string, content: string }
   */
  const handlePrivateMessage = async ({ receiverId, content }) => {
    const senderId = socket.userId; // Authenticated sender's ID

    if (!receiverId || !content) {
      socket.emit("chat-error", {
        message: "Receiver ID and content are required.",
      });
      return;
    }

    if (senderId === receiverId) {
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Cannot send message to yourself.",
      });
      return;
    }

    // 1. Get or create the private conversation
    const conversationResult = await chatService.getOrCreatePrivateConversation(
      senderId,
      receiverId
    );
    if (conversationResult.status !== 200) {
      socket.emit("chat-error", {
        message:
          conversationResult.message || "Failed to get/create conversation.",
      });
      return;
    }
    const conversation = conversationResult.data;

    // 2. Save the message to DB
    const saveMessageResult = await chatService.saveMessage(
      conversation._id,
      senderId,
      content
    );
    if (saveMessageResult.status !== 201) {
      socket.emit("chat-error", {
        message: saveMessageResult.message || "Failed to save message.",
      });
      return;
    }
    const newMessage = saveMessageResult.data;

    // 3. Emit the message to sender's all active sockets
    const senderSockets = socketUserMap.getSocketsByUserId(senderId);
    senderSockets.forEach((sId) => {
      io.to(sId).emit("receive-message", newMessage);
    });

    // 4. Emit the message to receiver's all active sockets
    const receiverSockets = socketUserMap.getSocketsByUserId(receiverId);
    receiverSockets.forEach((sId) => {
      if (sId !== socket.id) {
        // Avoid double sending to sender's current socket
        io.to(sId).emit("receive-message", newMessage);
      }
    });

    console.log(
      `Private message from ${senderId} to ${receiverId}: ${content}`
    );
  };

  /**
   * Handles sending a message to a group.
   * @param {object} data - { conversationId: string, content: string }
   */
  const handleGroupMessage = async ({ conversationId, content }) => {
    const senderId = socket.userId;

    if (!conversationId || !content) {
      socket.emit("chat-error", {
        message: "Conversation ID and content are required.",
      });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== "group") {
      socket.emit("chat-error", {
        message: "Invalid or non-group conversation ID.",
      });
      return;
    }

    // Ensure sender is part of the group
    if (!conversation.participants.includes(senderId)) {
      socket.emit("chat-error", {
        message: "You are not a participant of this group.",
      });
      return;
    }

    // Save the message to DB
    const saveMessageResult = await chatService.saveMessage(
      conversationId,
      senderId,
      content
    );
    if (saveMessageResult.status !== 201) {
      socket.emit("chat-error", {
        message: saveMessageResult.message || "Failed to save message.",
      });
      return;
    }
    const newMessage = saveMessageResult.data;

    // Emit the message to all participants in the group
    conversation.participants.forEach((participantId) => {
      const participantSockets = socketUserMap.getSocketsByUserId(
        participantId.toString()
      );
      participantSockets.forEach((sId) => {
        io.to(sId).emit("receive-message", newMessage);
      });
    });

    console.log(
      `Group message in ${conversationId} from ${senderId}: ${content}`
    );
  };

  /**
   * Handles fetching chat history for a conversation.
   * @param {object} data - { conversationId: string, limit?: number, skip?: number }
   */
  const handleGetChatHistory = async ({ conversationId, limit, skip }) => {
    const userId = socket.userId;

    if (!conversationId) {
      socket.emit("chat-error", {
        message: "Conversation ID is required for history.",
      });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      socket.emit("chat-error", {
        message: "You are not authorized to view this conversation history.",
      });
      return;
    }

    const historyResult = await chatService.getMessages(
      conversationId,
      limit,
      skip
    );
    if (historyResult.status === 200) {
      socket.emit("chat-history", {
        conversationId,
        messages: historyResult.data,
      });
    } else {
      socket.emit("chat-error", {
        message: historyResult.message || "Failed to fetch chat history.",
      });
    }
  };

  /**
   * Handles fetching user's conversations (private and group).
   */
  const handleGetUserConversations = async () => {
    const userId = socket.userId;
    const conversationsResult = await chatService.getUserConversations(userId);
    if (conversationsResult.status === 200) {
      socket.emit("user-conversations", {
        conversations: conversationsResult.data,
      });
    } else {
      socket.emit("chat-error", {
        message:
          conversationsResult.message || "Failed to fetch user conversations.",
      });
    }
  };

  // Register listeners
  socket.on(SOCKET_EVENTS.SEND_PRIVATE_MESSAGE, handlePrivateMessage);
  socket.on(SOCKET_EVENTS.SEND_GROUP_MESSAGE, handleGroupMessage);
  socket.on(SOCKET_EVENTS.GET_CHAT_HISTORY, handleGetChatHistory);
  socket.on(SOCKET_EVENTS.GET_USER_CONVERSATIONS, handleGetUserConversations);
};

export default chatHandler;
