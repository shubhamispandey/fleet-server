// backend/sockets/handlers/conversationHandler.js

import chatService from "../../services/chatService.js";
import socketUserMap from "../../utils/socketUserMap.js";
import SOCKET_EVENTS from "../../utils/socketEvents.js";
import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";
import { responseFormat } from "../../lib/helperFunctions.js";

const conversationHandler = (io, socket) => {
  const userId = socket.userId; // Authenticated user ID from socketAuthMiddleware

  // Helper: Map participants to string IDs
  const getParticipantIds = (participants) =>
    participants.map((p) => (p._id ? p._id.toString() : p.toString()));

  // Helper: Emit error in a consistent format
  const emitError = (message, status = 400) => {
    socket.emit(SOCKET_EVENTS.CHAT_ERROR, responseFormat({ message, status }));
  };

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
      const conversationResult =
        await chatService.getOrCreatePrivateConversation(userId, receiverId);
      if (conversationResult.status >= 400) {
        emitError(conversationResult.message, conversationResult.status);
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
        emitError(saveMessageResult.message, saveMessageResult.status);
        return;
      }
      const newMessage = saveMessageResult.data; // This message is populated with senderId
      console.log(newMessage);
      // Broadcast to all participants of this private conversation
      emitToUsers(
        getParticipantIds(conversation.participants),
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        { conversationId: conversation._id, message: newMessage }
      );

      // If a new conversation was created, notify both users
      if (conversationResult.created) {
        emitToUsers(
          getParticipantIds(conversation.participants),
          SOCKET_EVENTS.NEW_CONVERSATION_RECEIVED,
          {
            conversationId: conversation._id,
            conversation: conversation, // Send the full conversation object
          }
        );
      }
    } catch (error) {
      console.error("Error handling private message:", error);
      emitError("Failed to send private message.", 500);
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
        emitError(saveMessageResult.message, saveMessageResult.status);
        return;
      }
      const newMessage = saveMessageResult.data; // This message is populated with senderId

      const conversation = await Conversation.findById(conversationId).select(
        "participants"
      );
      if (!conversation) {
        emitError("Conversation not found.");
        return;
      }

      // Broadcast to all participants of this group conversation
      emitToUsers(
        getParticipantIds(conversation.participants),
        SOCKET_EVENTS.NEW_MESSAGE_RECEIVED,
        { conversationId: conversation._id, message: newMessage }
      );
    } catch (error) {
      console.error("Error handling group message:", error);
      emitError("Failed to send group message.", 500);
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
        emitError(result.message, result.status);
      }
    } catch (error) {
      console.error("Error getting chat history:", error);
      emitError("Failed to fetch chat history.", 500);
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
        emitError(result.message, result.status);
      }
    } catch (error) {
      console.error("Error getting user conversations:", error);
      emitError("Failed to fetch conversations.", 500);
    }
  };

  const handleCreateConversation = async ({
    type,
    participantId,
    participantIds,
    name,
  }) => {
    try {
      const currentUserId = socket.userId;
      let result;
      if (type === "private") {
        if (!participantId) {
          emitError("No User Selected  for a Conversation");
          return;
        }

        result = await chatService.getOrCreatePrivateConversation(
          currentUserId,
          participantId,
          name
        );
      } else if (type === "group") {
        if (
          !participantIds ||
          !Array.isArray(participantIds) ||
          participantIds.length < 1 ||
          !name
        ) {
          emitError(
            "participantIds (array) and name are required for group chat"
          );
          return;
        }
        result = await chatService.createGroupConversation(
          participantIds,
          name,
          currentUserId
        );
      } else {
        emitError('Invalid conversation type. Must be "private" or "group"');
        return;
      }

      if (result && result.data) {
        emitToUsers(
          getParticipantIds(result.data.participants),
          SOCKET_EVENTS.RECEIVE_CONVERSATION,
          responseFormat({
            message: "Conversation Created",
            status: 200,
            data: result.data,
          })
        );
      }
    } catch (error) {
      console.error("Error in createConversation:", error);
      emitError("Failed to create conversation.", 500);
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
      if (
        !conversation ||
        !getParticipantIds(conversation.participants).includes(userId)
      )
        return;

      // Emit to all participants in the conversation except the sender
      emitToUsers(
        getParticipantIds(conversation.participants).filter(
          (id) => id !== userId
        ),
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
        // Get the conversation to find all participants
        const conversation = await Conversation.findById(conversationId).select(
          "participants"
        );
        if (conversation) {
          // Emit MESSAGE_READ to all participants except the user who marked as read
          // This allows senders to know their messages have been read
          emitToUsers(
            getParticipantIds(conversation.participants).filter(
              (id) => id !== userId
            ),
            SOCKET_EVENTS.MESSAGE_READ,
            {
              conversationId,
              userId,
              modifiedCount: result.modifiedCount,
            }
          );
        }
      } else {
        emitError(result.message, result.status);
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      emitError("Failed to mark as read.", 500);
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
            getParticipantIds(conversation.participants),
            SOCKET_EVENTS.MESSAGE_DELETED,
            { conversationId, messageId, deletedBy: userId }
          );
        }
      } else {
        emitError(result.message, result.status);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      emitError("Failed to delete message.", 500);
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
    content,
  }) => {
    try {
      console.log(conversationId, messageId, content);
      const result = await chatService.updateMessage(
        conversationId,
        messageId,
        content,
        userId
      );

      if (result.status === 200) {
        const conversation = await Conversation.findById(conversationId).select(
          "participants"
        );

        emitToUsers(
          getParticipantIds(conversation.participants),
          SOCKET_EVENTS.MESSAGE_UPDATED,
          result
        );
      } else {
        emitError(result.message, result.status);
      }
    } catch (error) {
      console.error("Error updating message:", error);
      emitError("Failed to update message.", 500);
    }
  };

  // Register all Socket.IO event listeners for conversations and messages
  const eventHandlers = [
    [SOCKET_EVENTS.SEND_PRIVATE_MESSAGE, handleSendPrivateMessage],
    [SOCKET_EVENTS.SEND_GROUP_MESSAGE, handleSendGroupMessage],
    [SOCKET_EVENTS.CREATE_CONVERSATION, handleCreateConversation],
    [SOCKET_EVENTS.GET_CHAT_HISTORY, handleGetChatHistory],
    [SOCKET_EVENTS.GET_USER_CONVERSATIONS, handleGetUserConversations],
    [SOCKET_EVENTS.TYPING_INDICATOR, handleTypingIndicator],
    [SOCKET_EVENTS.MARK_CONVERSATION_AS_READ, handleMarkConversationAsRead],
    [SOCKET_EVENTS.DELETE_MESSAGE, handleDeleteMessage],
    [SOCKET_EVENTS.UPDATE_MESSAGE, handleUpdateMessage],
  ];
  eventHandlers.forEach(([event, handler]) => socket.on(event, handler));
};

export default conversationHandler;
