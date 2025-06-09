// backend/controllers/conversationController.js

import chatService from "../services/chatService.js";
import { responseFormat } from "../lib/helperFunctions.js";
import {
  DEFAULT_PAGE,
  DEFAULT_CONVERSATION_LIMIT,
  DEFAULT_MESSAGE_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH,
} from "../utils/config.js";

// API CALL
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId; // From authMiddleware
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || DEFAULT_CONVERSATION_LIMIT;
    const search = req.query.search || DEFAULT_SEARCH;
    const result = await chatService.getUserConversations(
      userId,
      page,
      limit,
      search
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in getConversations:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// API CALL
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId; // From authMiddleware
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || DEFAULT_MESSAGE_LIMIT;
    const result = await chatService.getMessages(
      conversationId,
      userId,
      page,
      limit
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in getConversationMessages:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// API CALL
export const searchConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId; // From authMiddleware
    const query = req.query.q;
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || DEFAULT_SEARCH_LIMIT;

    if (!query) {
      return res.status(400).json(
        responseFormat({
          message: "Search query (q) is required",
          status: 400,
        })
      );
    }

    const result = await chatService.searchMessagesInConversation(
      conversationId,
      userId,
      query,
      page,
      limit
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in searchConversationMessages:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// SOCKET CALL
export const postMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type } = req.body;
    const senderId = req.userId; // From authMiddleware

    if (!content) {
      return res.status(400).json(
        responseFormat({
          message: "Message content is required",
          status: 400,
        })
      );
    }

    const result = await chatService.saveMessage(
      conversationId,
      senderId,
      content,
      type
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in postMessage:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// API CALL
export const createConversation = async (req, res) => {
  try {
    const { type, participantId, participantIds, name } = req.body;
    const currentUserId = req.user.userId; // From authMiddleware
    let result;
    if (type === "private") {
      if (!participantId) {
        return res.status(400).json(
          responseFormat({
            message: "participantId is required for private chat",
            status: 400,
          })
        );
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
        return res.status(400).json(
          responseFormat({
            message:
              "participantIds (array) and name are required for group chat",
            status: 400,
          })
        );
      }
      result = await chatService.createGroupConversation(
        participantIds,
        name,
        currentUserId
      );
    } else {
      return res.status(400).json(
        responseFormat({
          message: 'Invalid conversation type. Must be "private" or "group"',
          status: 400,
        })
      );
    }

    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in createConversation:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// SOCKET CALL
export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId; // From authMiddleware
    const { lastMessageId } = req.body; // Optional: mark up to a specific message

    const result = await chatService.markMessagesAsRead(
      conversationId,
      userId,
      lastMessageId
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in markConversationAsRead:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// SOCKET CALL
export const deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.userId; // From authMiddleware
    const result = await chatService.deleteMessage(
      conversationId,
      messageId,
      userId
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

// SOCKET CALL
export const updateMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { newContent } = req.body;
    const userId = req.userId; // From authMiddleware

    if (
      !newContent ||
      typeof newContent !== "string" ||
      newContent.trim().length === 0
    ) {
      return res.status(400).json(
        responseFormat({
          message: "New content is required and must be a non-empty string",
          status: 400,
        })
      );
    }

    const result = await chatService.updateMessage(
      conversationId,
      messageId,
      newContent,
      userId
    );
    return res.status(result.status).json(responseFormat(result));
  } catch (error) {
    console.error("Error in updateMessage:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};
