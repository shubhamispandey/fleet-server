// backend/utils/socketEvents.js
// This file defines all Socket.IO event names used in the application.
// Using constants helps prevent typos and provides a clear overview of the real-time API.

const SOCKET_EVENTS = {
  // --- Core Connection & Disconnection ---

  CONNECTION: "connection", // Fired upon a successful connection from the client
  DISCONNECT: "disconnect", // Fired upon disconnection from the client
  ERROR: "error", // Fired when an error occurs on the socket connection

  // --- User Presence ---
  USER_ONLINE: "user-online", // Emitted when a user comes online
  USER_OFFLINE: "user-offline", // Emitted when a user goes offline

  // --- Chat Messaging ---
  SEND_PRIVATE_MESSAGE: "send-private-message", // Client sends a private message to another user
  SEND_GROUP_MESSAGE: "send-group-message", // Client sends a message to a group conversation
  RECEIVE_MESSAGE: "receive-message", // Server broadcasts a new message to relevant clients
  CHAT_ERROR: "chat-error", // Server sends an error related to chat operations

  GET_CHAT_HISTORY: "get-chat-history", // Client requests chat history for a conversation
  CHAT_HISTORY: "chat-history", // Server sends requested chat history
  GET_USER_CONVERSATIONS: "get-user-conversations", // Client requests list of all conversations for the user
  USER_CONVERSATIONS: "user-conversations", // Server sends list of user's conversations

  // --- Meeting Management & Signaling (Anticipated for future weeks) ---
  CREATE_ROOM: "create-room", // Client requests to create a new meeting room
  ROOM_CREATED: "room-created", // Server confirms room creation with room ID
  JOIN_ROOM: "join-room", // Client requests to join an existing meeting room
  ROOM_JOINED: "room-joined", // Server confirms client joined the room
  ROOM_ERROR: "room-error", // Server sends an error related to meeting room operations

  LEAVE_ROOM: "leave-room", // Client leaves the current meeting room
  END_ROOM: "end-room", // Host ends the meeting for all participants
  PARTICIPANT_LEFT: "participant-left", // Server notifies others when a participant leaves
  ROOM_ENDED: "room-ended", // Server notifies all participants when a room is ended

  // --- WebRTC Media Handling (Mediasoup) ---
  PRODUCE_MEDIA: "produce-media", // Client sends local media (audio/video/screen) to Mediasoup
  CONSUME_MEDIA: "consume-media", // Client requests to receive remote media from a producer
  NEW_PRODUCER: "new-producer", // Server notifies clients about a new media producer in the room
  TOGGLE_AUDIO_PRODUCER: "toggle-audio-producer", // Client requests to mute/unmute their audio
  TOGGLE_VIDEO_PRODUCER: "toggle-video-producer", // Client requests to enable/disable their video
  PRODUCER_STATUS_CHANGED: "producer-status-changed", // Server notifies clients about a producer's status change (e.g., muted)

  SCREEN_SHARE_STARTED: "screen-share-started", // Server notifies clients when a screen share begins
  SCREEN_SHARE_STOPPED: "screen-share-stopped", // Server notifies clients when a screen share ends

  // --- WebRTC Signaling (Direct Peer-to-Peer Fallback/Initial Offer-Answer - less common with SFU like Mediasoup, but good to list) ---
  // Note: With Mediasoup, these are often abstracted. However, if you have
  // specific direct signaling needs, they would be here.
  OFFER: "offer", // WebRTC SDP Offer
  ANSWER: "answer", // WebRTC SDP Answer
  ICE_CANDIDATE: "ice-candidate", // WebRTC ICE Candidate
};

export default SOCKET_EVENTS;
