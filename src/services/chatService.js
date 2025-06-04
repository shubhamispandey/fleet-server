// backend/services/chatService.js

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js"; // Needed for participant checks

const chatService = {
  /**
   * Finds or creates a private conversation between two users.
   * @param {string} user1Id - ID of the first user.
   * @param {string} user2Id - ID of the second user.
   * @returns {Promise<object>} - { status, message, data: conversation }
   */
  async getOrCreatePrivateConversation(user1Id, user2Id) {
    try {
      // Ensure participants are sorted to consistently find the conversation
      const participants = [user1Id, user2Id].sort();

      let conversation = await Conversation.findOne({
        type: "private",
        participants: { $all: participants, $size: 2 },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: "private",
          participants: participants,
        });
      }
      return { status: 200, data: conversation };
    } catch (error) {
      console.error("Error getting/creating private conversation:", error);
      return {
        status: 500,
        message: "Could not get/create private conversation",
      };
    }
  },

  /**
   * Saves a new message to the database.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} senderId - The ID of the message sender.
   * @param {string} content - The message content.
   * @returns {Promise<object>} - { status, message, data: newMessage }
   */
  async saveMessage(conversationId, senderId, content) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return { status: 404, message: "Conversation not found" };
      }

      // Ensure sender is a participant of the conversation
      if (!conversation.participants.includes(senderId)) {
        return {
          status: 403,
          message: "Sender is not a participant of this conversation",
        };
      }

      const newMessage = await Message.create({
        conversationId,
        senderId,
        content,
      });

      // Populate sender details for the response
      await newMessage.populate("senderId", "name avatar");

      return { status: 201, data: newMessage };
    } catch (error) {
      console.error("Error saving message:", error);
      return { status: 500, message: "Could not save message" };
    }
  },

  /**
   * Fetches messages for a given conversation.
   * @param {string} conversationId - The ID of the conversation.
   * @param {number} [limit=50] - Number of messages to fetch.
   * @param {number} [skip=0] - Number of messages to skip (for pagination).
   * @returns {Promise<object>} - { status, message, data: messages }
   */
  async getMessages(conversationId, limit = 50, skip = 0) {
    try {
      const messages = await Message.find({ conversationId })
        .sort({ timestamp: 1 }) // Ascending order
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name avatar"); // Populate sender details

      return { status: 200, data: messages };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { status: 500, message: "Could not fetch messages" };
    }
  },

  /**
   * Creates a new group conversation.
   * @param {string[]} participantIds - Array of user IDs for participants.
   * @param {string} groupName - Name of the group.
   * @param {string} adminId - ID of the user creating the group (admin).
   * @returns {Promise<object>} - { status, message, data: newConversation }
   */
  async createGroupConversation(participantIds, groupName, adminId) {
    try {
      if (!groupName || participantIds.length < 2) {
        // At least 2 participants besides admin if admin is also in participantIds
        return {
          status: 400,
          message: "Group name and at least two participants are required",
        };
      }
      if (!participantIds.includes(adminId)) {
        participantIds.push(adminId); // Ensure admin is also a participant
      }

      const newConversation = await Conversation.create({
        type: "group",
        name: groupName,
        participants: participantIds,
        groupAdmin: adminId,
      });
      return { status: 201, data: newConversation };
    } catch (error) {
      console.error("Error creating group conversation:", error);
      return { status: 500, message: "Could not create group conversation" };
    }
  },

  /**
   * Gets all conversations for a given user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object>} - { status, message, data: conversations }
   */
  async getUserConversations(userId) {
    try {
      const conversations = await Conversation.find({ participants: userId })
        .populate("participants", "name avatar email status") // Populate participants
        .sort({ updatedAt: -1 }); // Sort by most recent activity

      return { status: 200, data: conversations };
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      return { status: 500, message: "Could not fetch conversations" };
    }
  },
};

export default chatService;
