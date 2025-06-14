// backend/routes/conversationRoutes.js

import express from "express";
import {
  getConversations,
  getConversationMessages,
  searchConversationMessages,
  postMessage,
  markConversationAsRead,
  deleteMessage,
  updateMessage,
} from "../controllers/conversationController.js";
import authMiddleware from "../middlewares/authMiidleware.js"; // Ensure correct path

const router = express.Router();

// Apply authentication middleware to all routes in this file
router.use(authMiddleware);

// Conversations
router.get("/", getConversations); // GET /api/conversations (Fetch all conversations for the user)

// Messages within a specific conversation
router.get("/:conversationId/messages", getConversationMessages); // GET /api/conversations/{conversationId}/messages
router.post("/:conversationId/messages", postMessage); // POST /api/conversations/{conversationId}/messages (for REST fallback)
router.get("/:conversationId/search", searchConversationMessages); // GET /api/conversations/{conversationId}/search

// Message Actions
router.patch("/:conversationId/read", markConversationAsRead); // PATCH /api/conversations/{conversationId}/read
router.delete("/:conversationId/messages/:messageId", deleteMessage); // DELETE /api/conversations/{conversationId}/messages/{messageId}
router.patch("/:conversationId/messages/:messageId", updateMessage); // PATCH /api/conversations/{conversationId}/messages/{messageId}

export default router;
