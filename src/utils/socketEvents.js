// backend/utils/socketEvents.js
// This file defines all Socket.IO event names used in the application.

const SOCKET_EVENTS = {
  // --- Core Connection & Disconnection ---
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // --- User Presence ---
  USER_ONLINE: "user-online",
  USER_OFFLINE: "user-offline",

  // --- Chat Messaging ---
  SEND_PRIVATE_MESSAGE: "send-private-message", // Client sends a private message to another user
  SEND_GROUP_MESSAGE: "send-group-message", // Client sends a message to a group conversation
  RECEIVE_MESSAGE: "receive-message", // Server broadcasts a new message to relevant clients
  CREATE_CONVERSATION: "create-conversation", // Client sends conversation that is created to another client
  RECEIVE_CONVERSATION: "receive-conversation", // Server sends a conversation to a client
  TYPING_INDICATOR: "typing-indicator", // Client/Server broadcasts typing status
  CHAT_ERROR: "chat-error", // Server sends an error related to chat operations

  GET_CHAT_HISTORY: "get-chat-history", // Client requests chat history for a conversation
  CHAT_HISTORY: "chat-history", // Server sends requested chat history

  GET_USER_CONVERSATIONS: "get-user-conversations", // Client requests list of all conversations for the user
  USER_CONVERSATIONS: "user-conversations", // Server sends list of user's conversations
  NEW_CONVERSATION_RECEIVED: "new-conversation-received", // Server broadcasts a new conversation creation

  MARK_CONVERSATION_AS_READ: "mark-conversation-as-read", // Client requests to mark messages in a conversation as read
  MESSAGE_READ: "message-read", // Server broadcasts message read status

  DELETE_MESSAGE: "delete-message", // Client requests to delete a message
  MESSAGE_DELETED: "message-deleted", // Server broadcasts message deletion

  UPDATE_MESSAGE: "update-message", // Client requests to update a message
  MESSAGE_UPDATED: "message-updated", // Server broadcasts message update

  // --- Meeting Management & Signaling (Anticipated for future weeks) ---
  CREATE_ROOM: "create-room",
  ROOM_CREATED: "room-created",
  JOIN_ROOM: "join-room",
  ROOM_JOINED: "room-joined",
  ROOM_ERROR: "room-error",

  LEAVE_ROOM: "leave-room",
  END_ROOM: "end-room",
  PARTICIPANT_LEFT: "participant-left",
  ROOM_ENDED: "room-ended",

  // --- WebRTC Media Handling (Mediasoup) ---
  PRODUCE_MEDIA: "produce-media",
  CONSUME_MEDIA: "consume-media",
  NEW_PRODUCER: "new-producer",
  TOGGLE_AUDIO_PRODUCER: "toggle-audio-producer",
  TOGGLE_VIDEO_PRODUCER: "toggle-video-producer",
  PRODUCER_STATUS_CHANGED: "producer-status-changed",
  SCREEN_SHARE_STARTED: "screen-share-started",
  SCREEN_SHARE_STOPPED: "screen-share-stopped",
};

export default SOCKET_EVENTS;
