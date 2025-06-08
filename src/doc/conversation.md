# Conversation Flow with Socket Integration

This document describes the flow of conversations and messages in the system, including how real-time updates are handled using sockets.

---

## 1. Conversation Creation

- **Private Conversation:**  
  - User A initiates a private chat with User B.
  - API: `POST /conversations` with `{ type: "private", participantId: "userB_id" }`
  - If a conversation already exists, it is returned; otherwise, a new one is created.
  - Both users are notified via socket events (e.g., `conversation:new`).

- **Group Conversation:**  
  - User creates a group chat with multiple participants.
  - API: `POST /conversations` with `{ type: "group", participantIds: [...], name: "Group Name" }`
  - All participants receive a socket event about the new group.

---

## 2. Fetching Conversations

- **API:** `GET /conversations?page=1&limit=20`
- Returns a paginated list of conversations for the authenticated user.
- On login or refresh, the client fetches the latest conversations.

---

## 3. Sending Messages

- **API:** `POST /conversations/:conversationId/messages` with `{ content, type }`
- The message is saved and broadcast to all participants in the conversation via socket event `message:new`.
- The sender receives confirmation, and all other participants receive the new message in real-time.

---

## 4. Receiving Messages (Socket)

- **Socket Event:** `message:new`
- Payload includes message details and conversationId.
- Clients listen for this event to update the UI in real-time.

---

## 5. Fetching Messages

- **API:** `GET /conversations/:conversationId/messages?page=1&limit=50`
- Returns a paginated list of messages for the conversation.

---

## 6. Marking Messages as Read

- **API:** `POST /conversations/:conversationId/read` with `{ lastMessageId }`
- Marks messages up to `lastMessageId` as read for the user.
- Socket event `message:read` can be emitted to notify other participants.

---

## 7. Editing and Deleting Messages

- **Edit:**  
  - API: `PUT /conversations/:conversationId/messages/:messageId` with `{ newContent }`
  - Socket event: `message:updated`

- **Delete:**  
  - API: `DELETE /conversations/:conversationId/messages/:messageId`
  - Socket event: `message:deleted`

---

## 8. Real-Time Updates with Sockets

- **Joining Rooms:**  
  - On login, the client joins socket rooms for each conversation.
  - This ensures the user receives real-time updates for all their conversations.

- **Socket Events:**
  - `conversation:new` — New conversation created
  - `message:new` — New message sent
  - `message:updated` — Message edited
  - `message:deleted` — Message deleted
  - `message:read` — Messages marked as read

---

## 9. Example Socket Flow

1. User A sends a message in Conversation X.
2. Server saves the message and emits `message:new` to all users in Conversation X.
3. All clients in that room receive the event and update their UI.
4. When User B reads the message, they call the read API, and the server emits `message:read` to Conversation X.

---

## 10. Summary

- All conversation and message actions are available via REST APIs.
- Real-time updates are handled via socket events, ensuring all participants see changes instantly.
- Clients should handle both API responses and socket events for a seamless chat experience.
