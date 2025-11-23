const { chatRepository, messageRepository } = require("./chat.repository");

/**
 * Initialize Socket.IO for chat feature
 * @param {Server} io - Socket.IO server instance
 */
function initializeChatSocket(io) {
  // Store user socket mappings
  const userSockets = new Map(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Authenticate user from session
    const userId = socket.request.session?.passport?.user;
    if (!userId) {
      console.log("⚠️ Unauthenticated socket connection");
      socket.disconnect();
      return;
    }

    // Store user socket mapping
    userSockets.set(userId.toString(), socket.id);
    console.log(`✅ User ${userId} authenticated on socket ${socket.id}`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    /**
     * Join a specific chat room
     */
    socket.on("join-chat", async (chatId) => {
      try {
        const chat = await chatRepository.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        // Verify user is a participant
        const isParticipant = chat.participants.some(
          (p) => p._id.toString() === userId.toString()
        );
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant in this chat" });
          return;
        }

        socket.join(`chat:${chatId}`);
        console.log(`User ${userId} joined chat ${chatId}`);

        // Load and send chat history
        const messages = await messageRepository.findByChatId(chatId);
        socket.emit("chat-history", { chatId, messages });
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Error joining chat" });
      }
    });

    /**
     * Leave a specific chat room
     */
    socket.on("leave-chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userId} left chat ${chatId}`);
    });

    /**
     * Send a new message
     */
    socket.on("send-message", async ({ chatId, content }) => {
      try {
        if (!content || !content.trim()) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        // Create message
        const message = await messageRepository.createMessage(
          chatId,
          userId,
          content.trim()
        );

        // Update chat's last message
        await chatRepository.updateLastMessage(chatId, message._id);

        // Broadcast to all users in the chat room
        io.to(`chat:${chatId}`).emit("new-message", { chatId, message });

        // Notify all participants about chat update
        const chat = await chatRepository.findById(chatId);
        chat.participants.forEach((participant) => {
          io.to(`user:${participant._id}`).emit("chat-updated", {
            chatId,
            lastMessage: message,
          });
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Error sending message" });
      }
    });

    /**
     * Edit a message
     */
    socket.on("edit-message", async ({ messageId, content }) => {
      try {
        if (!content || !content.trim()) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        // Get original message
        const originalMessage = await messageRepository.findById(messageId);
        if (!originalMessage) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Verify user owns the message
        if (originalMessage.senderId.toString() !== userId.toString()) {
          socket.emit("error", {
            message: "You can only edit your own messages",
          });
          return;
        }

        // Update message
        const updatedMessage = await messageRepository.updateMessage(
          messageId,
          content.trim()
        );

        // Broadcast to all users in the chat room
        io.to(`chat:${originalMessage.chatId}`).emit("message-edited", {
          chatId: originalMessage.chatId,
          message: updatedMessage,
        });
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", { message: "Error editing message" });
      }
    });

    /**
     * Delete a message
     */
    socket.on("delete-message", async ({ messageId }) => {
      try {
        // Get original message
        const message = await messageRepository.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Verify user owns the message
        if (message.senderId.toString() !== userId.toString()) {
          socket.emit("error", {
            message: "You can only delete your own messages",
          });
          return;
        }

        // Delete message
        await messageRepository.deleteMessage(messageId);

        // Broadcast to all users in the chat room
        io.to(`chat:${message.chatId}`).emit("message-deleted", {
          chatId: message.chatId,
          messageId,
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Error deleting message" });
      }
    });

    /**
     * Handle disconnect
     */
    socket.on("disconnect", () => {
      userSockets.delete(userId.toString());
      console.log(`🔌 User ${userId} disconnected`);
    });
  });
}

module.exports = { initializeChatSocket };
