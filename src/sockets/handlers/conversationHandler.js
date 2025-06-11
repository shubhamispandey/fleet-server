// backend/sockets/handlers/conversationHandler.js

import chatService from "../../services/chatService.js";
import socketUserMap from "../../utils/socketUserMap.js";
import SOCKET_EVENTS from "../../utils/socketEvents.js";

const conversationHandler = (io, socket) => {
  const userId = socket.userId; // Authenticated user ID from socketAuthMiddleware

  /**
   * Helper to emit a message to all active sockets of specified users.
   * @param {string[]} recipientUserIds - Array of user IDs to send the message to.
   * @param {string} eventName - The Socket.IO event name.
   * @param {object} payload - The data payload to send.
   */
  const emitToUsers = (recipientUserIds, eventName, payload) => {
    recipientUserIds.forEach((recipientUserId) => {
      const recipientSockets =
        socketUserMap.getSocketsByUserId(recipientUserId);
      recipientSockets.forEach((sId) => {
        io.to(sId).emit(eventName, payload);
      });
    });
  };

  /**
   * Handles sending a private message.
   * Emits NEW_MESSAGE_RECEIVED to sender's and receiver's sockets.
   * @param {object} data - { receiverId: string, content: string, type?: string }
   */
  const handleSendPrivateMessage = async ({
    receiverId,
    content,
    type = "text",
  }) => {
    try {
      console.log("===>>", receiverId, content, type);
      const conversationResult =
        await chatService.getOrCreatePrivateConversation(userId, receiverId);
      if (conversationResult.status >= 400) {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: conversationResult.message,
        });
        return;
      }
      const conversation = conversationResult.data;

      const saveMessageResult = await chatService.saveMessage(
        conversation._id,
        userId,
        content,
        type
      );
      if (saveMessageResult.status >= 400) {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: saveMessageResult.message,
        });
        return;
      }
      const newMessage = saveMessageResult.data; // This message is populated with senderId
      console.log(newMessage);
      // Broadcast to all participants of this private conversation
      emitToUsers(
        conversation.participants.map((p) => p._id.toString()),
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        { conversationId: conversation._id, message: newMessage }
      );

      // If a new conversation was created, notify both users
      if (conversationResult.created) {
        emitToUsers(
          conversation.participants.map((p) => p._id.toString()),
          SOCKET_EVENTS.NEW_CONVERSATION_RECEIVED,
          {
            conversationId: conversation._id,
            conversation: conversation, // Send the full conversation object
          }
        );
      }
    } catch (error) {
      console.error("Error handling private message:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to send private message.",
      });
    }
  };

  /**
   * Handles sending a group message.
   * Emits NEW_MESSAGE_RECEIVED to all group members.
   * @param {object} data - { conversationId: string, content: string, type?: string }
   */
  const handleSendGroupMessage = async ({
    conversationId,
    content,
    type = "text",
  }) => {
    try {
      const saveMessageResult = await chatService.saveMessage(
        conversationId,
        userId,
        content,
        type
      );
      if (saveMessageResult.status >= 400) {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: saveMessageResult.message,
        });
        return;
      }
      const newMessage = saveMessageResult.data; // This message is populated with senderId

      const conversation = await Conversation.findById(conversationId).select(
        "participants"
      );
      if (!conversation) {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: "Conversation not found.",
        });
        return;
      }

      // Broadcast to all participants of this group conversation
      emitToUsers(
        conversation.participants.map((p) => p.toString()),
        SOCKET_EVENTS.NEW_MESSAGE_RECEIVED,
        { conversationId: conversation._id, message: newMessage }
      );
    } catch (error) {
      console.error("Error handling group message:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to send group message.",
      });
    }
  };

  /**
   * Handles client request for chat history.
   * Emits CHAT_HISTORY.
   * @param {object} data - { conversationId: string, page?: number, limit?: number }
   */
  const handleGetChatHistory = async ({ conversationId, page, limit }) => {
    try {
      const result = await chatService.getMessages(
        conversationId,
        userId,
        page,
        limit
      );
      if (result.status === 200) {
        socket.emit(SOCKET_EVENTS.CHAT_HISTORY, {
          conversationId,
          messages: result.data.messages,
          totalCount: result.data.totalCount,
          page: result.data.page,
          limit: result.data.limit,
        });
      } else {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: result.message });
      }
    } catch (error) {
      console.error("Error getting chat history:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to fetch chat history.",
      });
    }
  };

  /**
   * Handles client request for user's conversations.
   * Emits USER_CONVERSATIONS.
   * @param {object} data - { page?: number, limit?: number }
   */
  const handleGetUserConversations = async ({ page, limit } = {}) => {
    try {
      const result = await chatService.getUserConversations(
        userId,
        page,
        limit
      );
      if (result.status === 200) {
        socket.emit(SOCKET_EVENTS.USER_CONVERSATIONS, {
          conversations: result.data.conversations,
          totalCount: result.data.totalCount,
          page: result.data.page,
          limit: result.data.limit,
        });
      } else {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: result.message });
      }
    } catch (error) {
      console.error("Error getting user conversations:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to fetch conversations.",
      });
    }
  };

  /**
   * Handles typing indicator.
   * Broadcasts TYPING_INDICATOR to other participants in the conversation.
   * @param {object} data - { conversationId: string, isTyping: boolean }
   */
  const handleTypingIndicator = async ({ conversationId, isTyping }) => {
    try {
      const conversation = await Conversation.findById(conversationId).select(
        "participants"
      );
      if (!conversation || !conversation.participants.includes(userId)) {
        // User not in conversation or not found
        return;
      }
      // Emit to all participants in the conversation except the sender
      emitToUsers(
        conversation.participants
          .map((p) => p.toString())
          .filter((id) => id !== userId),
        SOCKET_EVENTS.TYPING_INDICATOR,
        { conversationId, userId, isTyping }
      );
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  };

  /**
   * Handles marking messages in a conversation as read.
   * Emits MESSAGE_READ to relevant users.
   * @param {object} data - { conversationId: string, lastMessageId?: string }
   */
  const handleMarkConversationAsRead = async ({
    conversationId,
    lastMessageId,
  }) => {
    try {
      const result = await chatService.markMessagesAsRead(
        conversationId,
        userId,
        lastMessageId
      );
      if (result.status === 200) {
        // Optionally, emit an event to notify others that messages are read
        // For now, this is mainly for the user who initiated the read,
        // and could imply unread counts for others are affected.
        // A more complex system might emit MESSAGE_READ to the sender of the marked messages.
        socket.emit(SOCKET_EVENTS.MESSAGE_READ, {
          conversationId,
          userId,
          modifiedCount: result.modifiedCount,
        });
      } else {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: result.message });
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to mark as read.",
      });
    }
  };

  /**
   * Handles deleting a message.
   * Broadcasts MESSAGE_DELETED to relevant users.
   * @param {object} data - { conversationId: string, messageId: string }
   */
  const handleDeleteMessage = async ({ conversationId, messageId }) => {
    try {
      const result = await chatService.deleteMessage(
        conversationId,
        messageId,
        userId
      );
      if (result.status === 200) {
        const conversation = await Conversation.findById(conversationId).select(
          "participants"
        );
        if (conversation) {
          emitToUsers(
            conversation.participants.map((p) => p.toString()),
            SOCKET_EVENTS.MESSAGE_DELETED,
            { conversationId, messageId, deletedBy: userId }
          );
        }
      } else {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: result.message });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to delete message.",
      });
    }
  };

  /**
   * Handles updating a message.
   * Broadcasts MESSAGE_UPDATED to relevant users.
   * @param {object} data - { conversationId: string, messageId: string, newContent: string }
   */
  const handleUpdateMessage = async ({
    conversationId,
    messageId,
    newContent,
  }) => {
    try {
      const result = await chatService.updateMessage(
        conversationId,
        messageId,
        newContent,
        userId
      );
      if (result.status === 200) {
        const conversation = await Conversation.findById(conversationId).select(
          "participants"
        );
        if (conversation) {
          emitToUsers(
            conversation.participants.map((p) => p.toString()),
            SOCKET_EVENTS.MESSAGE_UPDATED,
            { conversationId, messageId, newContent, updatedBy: userId }
          );
        }
      } else {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: result.message });
      }
    } catch (error) {
      console.error("Error updating message:", error);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "Failed to update message.",
      });
    }
  };

  // Register all Socket.IO event listeners for conversations and messages
  socket.on(SOCKET_EVENTS.SEND_PRIVATE_MESSAGE, handleSendPrivateMessage);
  socket.on(SOCKET_EVENTS.SEND_GROUP_MESSAGE, handleSendGroupMessage);
  socket.on(SOCKET_EVENTS.GET_CHAT_HISTORY, handleGetChatHistory);
  socket.on(SOCKET_EVENTS.GET_USER_CONVERSATIONS, handleGetUserConversations);
  socket.on(SOCKET_EVENTS.TYPING_INDICATOR, handleTypingIndicator);
  socket.on(
    SOCKET_EVENTS.MARK_CONVERSATION_AS_READ,
    handleMarkConversationAsRead
  );
  socket.on(SOCKET_EVENTS.DELETE_MESSAGE, handleDeleteMessage);
  socket.on(SOCKET_EVENTS.UPDATE_MESSAGE, handleUpdateMessage);
};

export default conversationHandler;
