// backend/services/chatService.js

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js"; // Needed for participant checks

const chatService = {
  /**
   * Gets all conversations for a given user, with pagination.
   * Sorts by lastActivityAt to show most recent first.
   * @param {string} userId - The ID of the user.
   * @param {number} [page=1] - The page number.
   * @param {number} [limit=20] - The number of conversations per page. Use -1 for all.
   * @param {string} search - The Search Filter
   * @returns {Promise<object>} - { status, message, data: conversations }
   */
  // ...existing code...
  async getUserConversations(userId, page = 1, limit = 20, search = "") {
    try {
      const skip = limit === -1 ? 0 : (page - 1) * limit;
      let findQuery = { participants: userId };

      if (search && search.trim() !== "") {
        // 1. Find users matching the search string
        const matchedUsers = await User.find(
          { name: { $regex: search, $options: "i" } },
          { _id: 1 }
        );

        const matchedUserIds = matchedUsers
          .filter((u) => u._id.toString() && userId !== u._id.toString())
          .map((u) => u._id.toString());

        // 2. Always require userId, and if there are matches, require at least one matched user
        if (matchedUserIds.length > 0) {
          findQuery = {
            participants: { $all: [userId], $in: matchedUserIds },
          };
        } else {
          // If no users matched, return empty result
          return {
            status: 200,
            data: { conversations: [], totalCount: 0, page, limit },
            message: "Conversations fetched successfully",
          };
        }
      }

      const conversations = await Conversation.find(findQuery)
        .populate("participants", "name avatar email status")
        .populate({
          path: "lastMessage",
          populate: { path: "senderId", select: "name avatar" },
        })
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit === -1 ? 0 : limit);

      const totalCount = await Conversation.countDocuments(findQuery);

      return {
        status: 200,
        data: { conversations, totalCount, page, limit },
        message: "Conversations fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      return { status: 500, message: "Could not fetch conversations" };
    }
  },
  // ...existing code...

  /**
   * Finds or creates a private conversation between two users.
   * @param {string} user1Id - ID of the first user.
   * @param {string} user2Id - ID of the second user.
   * @param {string} name
   * @returns {Promise<object>} - { status, message, data: conversation, created: boolean }
   */
  async getOrCreatePrivateConversation(user1Id, user2Id, name) {
    try {
      if (user1Id === user2Id) {
        return {
          status: 400,
          message: "Cannot create private conversation with self.",
        };
      }

      // Ensure participants are sorted to consistently find the conversation
      const participants = [user1Id, user2Id].sort();

      let conversation = await Conversation.findOne({
        type: "private",
        participants: { $all: participants, $size: 2 },
      }).populate("participants", "name avatar email status");

      let created = false;
      if (!conversation) {
        conversation = await Conversation.create({
          type: "private",
          participants: participants,
          lastActivityAt: new Date(),
          name: name || `${participants[0]} & ${participants[1]}`,
        });
        created = true;
        // Populate participants after creation for the response
        conversation = await conversation.populate(
          "participants",
          "name avatar email status"
        );
      }
      return { status: created ? 201 : 200, data: conversation, created };
    } catch (error) {
      console.error("Error getting/creating private conversation:", error);
      return {
        status: 500,
        message: "Could not get/create private conversation",
      };
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
      if (!groupName || participantIds.length < 1) {
        // At least 1 participant besides admin
        return {
          status: 400,
          message:
            "Group name and at least one participant (excluding admin if already included) are required",
        };
      }
      // Ensure admin is part of the participants array
      if (!participantIds.includes(adminId)) {
        participantIds.push(adminId);
      }
      // Ensure unique participants
      const distinctParticipants = [...new Set(participantIds)];

      const newConversation = await Conversation.create({
        type: "group",
        name: groupName,
        participants: distinctParticipants,
        groupAdmin: adminId,
        lastActivityAt: new Date(), // Set initial activity time
      });

      // Populate participants after creation for the response
      await newConversation.populate(
        "participants",
        "name avatar email status"
      );

      return { status: 201, data: newConversation };
    } catch (error) {
      console.error("Error creating group conversation:", error);
      return { status: 500, message: "Could not create group conversation" };
    }
  },

  /**
   * Saves a new message to the database and updates conversation.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} senderId - The ID of the message sender.
   * @param {string} content - The message content.
   * @param {string} [type='text'] - The type of message (text, image, file).
   * @returns {Promise<object>} - { status, message, data: newMessage }
   */
  async saveMessage(conversationId, senderId, content, type = "text") {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return { status: 404, message: "Conversation not found" };
      }

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
        type,
      });

      // Update conversation's lastMessage and lastActivityAt
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
        lastActivityAt: newMessage.createdAt,
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
   * Fetches messages for a given conversation with pagination.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} userId - The ID of the user requesting messages (for authorization).
   * @param {number} [page=1] - The page number.
   * @param {number} [limit=50] - The number of messages per page. Use -1 for all.
   * @returns {Promise<object>} - { status, message, data: { messages, totalCount, page, limit } }
   */
  async getMessages(conversationId, userId, page = 1, limit = 50) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return { status: 404, message: "Conversation not found" };
      }
      if (!conversation.participants.includes(userId)) {
        return {
          status: 403,
          message: "Not authorized to view this conversation messages",
        };
      }

      const skip = limit === -1 ? 0 : (page - 1) * limit;
      const findQuery = { conversationId };

      const messages = await Message.find(findQuery)
        .sort({ createdAt: 1 }) // Always sort by creation time for chat history
        .skip(skip)
        .limit(limit === -1 ? 0 : limit)
        .populate("senderId", "name avatar"); // Populate sender details

      const totalCount = await Message.countDocuments(findQuery);

      return {
        status: 200,
        data: { messages, totalCount, page, limit },
        message: "Messages fetched successfully!",
      };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { status: 500, message: "Could not fetch messages" };
    }
  },

  /**
   * Searches messages within a specific conversation.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} userId - The ID of the user requesting search.
   * @param {string} query - The search query string.
   * @param {number} [page=1] - The page number.
   * @param {number} [limit=20] - The number of results per page. Use -1 for all.
   * @returns {Promise<object>} - { status, message, data: { messages, totalCount, page, limit } }
   */
  async searchMessagesInConversation(
    conversationId,
    userId,
    query,
    page = 1,
    limit = 20
  ) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return { status: 404, message: "Conversation not found" };
      }
      if (!conversation.participants.includes(userId)) {
        return {
          status: 403,
          message: "Not authorized to search this conversation",
        };
      }

      const skip = limit === -1 ? 0 : (page - 1) * limit;
      const findQuery = {
        conversationId,
        content: { $regex: query, $options: "i" }, // Case-insensitive search
      };

      const messages = await Message.find(findQuery)
        .sort({ createdAt: -1 }) // Sort by most recent for search results
        .skip(skip)
        .limit(limit === -1 ? 0 : limit)
        .populate("senderId", "name avatar");

      const totalCount = await Message.countDocuments(findQuery);

      return { status: 200, data: { messages, totalCount, page, limit } };
    } catch (error) {
      console.error("Error searching messages:", error);
      return { status: 500, message: "Could not search messages" };
    }
  },

  /**
   * Marks messages in a conversation as read by a user.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} userId - The ID of the user marking as read.
   * @param {string} [lastMessageId] - Optional: Only mark messages UP TO this ID as read.
   * @returns {Promise<object>} - { status, message }
   */
  async markMessagesAsRead(conversationId, userId, lastMessageId = null) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return { status: 404, message: "Conversation not found" };
      }
      if (!conversation.participants.includes(userId)) {
        return {
          status: 403,
          message: "Not authorized to mark messages in this conversation",
        };
      }

      let query = {
        conversationId: conversationId,
        senderId: { $ne: userId }, // Don't mark sender's own messages as read by self
        readBy: { $ne: userId }, // Only messages not yet read by this user
      };

      if (lastMessageId) {
        // Mark all messages up to and including lastMessageId as read
        const lastMessage = await Message.findById(lastMessageId);
        if (lastMessage) {
          query.createdAt = { $lte: lastMessage.createdAt };
        }
      }

      const updateResult = await Message.updateMany(
        query,
        { $addToSet: { readBy: userId } } // Add user to readBy array if not already present
      );

      return {
        status: 200,
        message: "Messages marked as read",
        modifiedCount: updateResult.modifiedCount,
      };
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return { status: 500, message: "Could not mark messages as read" };
    }
  },

  /**
   * Deletes a specific message.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} messageId - The ID of the message to delete.
   * @param {string} userId - The ID of the user requesting deletion (for authorization).
   * @returns {Promise<object>} - { status, message }
   */
  async deleteMessage(conversationId, messageId, userId) {
    try {
      const message = await Message.findOne({ _id: messageId, conversationId });

      if (!message) {
        return {
          status: 404,
          message: "Message not found in this conversation",
        };
      }

      // Only the sender can delete their own message (or maybe admin for group chats)
      if (message.senderId.toString() !== userId) {
        // You could add logic here for group admins to delete others' messages
        // Check if user is conversation admin: const conversation = await Conversation.findById(conversationId); if (conversation.groupAdmin.toString() === userId) { ... }
        return {
          status: 403,
          message: "Not authorized to delete this message",
        };
      }

      await Message.deleteOne({ _id: messageId });

      // Update conversation's lastMessage if the deleted message was the last one
      const conversation = await Conversation.findById(conversationId);
      if (
        conversation &&
        conversation.lastMessage &&
        conversation.lastMessage.toString() === messageId
      ) {
        const newLastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .select("_id createdAt"); // Get the new last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newLastMessage ? newLastMessage._id : null,
          lastActivityAt: newLastMessage
            ? newLastMessage.createdAt
            : conversation.createdAt, // Fallback to conv creation date
        });
      }

      return { status: 200, message: "Message deleted successfully" };
    } catch (error) {
      console.error("Error deleting message:", error);
      return { status: 500, message: "Could not delete message" };
    }
  },

  /**
   * Updates the content of a specific message.
   * @param {string} conversationId - The ID of the conversation.
   * @param {string} messageId - The ID of the message to update.
   * @param {string} newContent - The new content for the message.
   * @param {string} userId - The ID of the user requesting update (for authorization).
   * @returns {Promise<object>} - { status, message, data: updatedMessage }
   */
  async updateMessage(conversationId, messageId, newContent, userId) {
    try {
      const message = await Message.findOne({ _id: messageId, conversationId });

      if (!message) {
        return {
          status: 404,
          message: "Message not found in this conversation",
        };
      }

      // Only the sender can update their own message
      if (message.senderId.toString() !== userId) {
        return {
          status: 403,
          message: "Not authorized to update this message",
        };
      }

      message.content = newContent;
      await message.save();

      // Populate sender details for the response
      await message.populate("senderId", "name avatar");

      return {
        status: 200,
        message: "Message updated successfully",
        data: message,
      };
    } catch (error) {
      console.error("Error updating message:", error);
      return { status: 500, message: "Could not update message" };
    }
  },
};

export default chatService;
