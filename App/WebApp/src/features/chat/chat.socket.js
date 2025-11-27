const { chatRepository, messageRepository } = require("./chat.repository");

/**
 * Initialize Socket.IO for chat feature
 * @param {Server} io - Socket.IO server instance
 */
function initializeChatSocket(io) {
  // Store user socket mappings
  const userSockets = new Map(); // userId -> socketId
  io.on("connection", (socket) => {
    /**
     * Typing indicator
     */
    socket.on("typing", ({ chatId }) => {
      // Broadcast to all users in the chat room except the sender
      socket.to(`chat:${chatId}`).emit("user-typing", {
        chatId,
        userId,
      });
    });
    console.log(`🔌 User connected: ${socket.id}`);

    // Authenticate user from session
    const userId = socket.request.session?.passport?.user;
    if (!userId) {
      console.log("⚠️ Unauthenticated socket connection - no user in session");
      console.log(
        "Available session keys:",
        Object.keys(socket.request.session || {})
      );
      socket.disconnect();
      return;
    }

    // Store user socket mapping
    userSockets.set(userId.toString(), socket.id);

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
    });

    /**
     * Send a new message
     */
    socket.on("send-message", async ({ chatId, content }) => {
      try {
        // Accept if content is non-empty text or contains valid HTML (e.g., <img ...>)
        const isEmptyText = !content || !content.trim();
        const isHtmlWithImage =
          typeof content === "string" &&
          /<img\s+[^>]*src=["'][^"']+["'][^>]*>/i.test(content);
        if (isEmptyText && !isHtmlWithImage) {
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
     * Soft-delete a message
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

        // Soft-delete message
        const deletedMessage = await messageRepository.deleteMessage(messageId);

        // Broadcast to all users in the chat room
        io.to(`chat:${message.chatId}`).emit("message-deleted", {
          chatId: message.chatId,
          message: deletedMessage,
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Error deleting message" });
      }
    });

    /**
     * Rename a group chat
     */
    socket.on("rename-chat", async ({ chatId, newName }) => {
      try {
        if (!newName || !newName.trim()) {
          socket.emit("error", { message: "Neuer Name darf nicht leer sein" });
          return;
        }
        const chat = await chatRepository.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat nicht gefunden" });
          return;
        }
        if (chat.type !== "group") {
          socket.emit("error", {
            message: "Nur Gruppen können umbenannt werden",
          });
          return;
        }
        const isCreator = chat.creatorId._id.toString() === userId.toString();
        const requestingUser = socket.request.session?.passport?.userRole; // may not exist
        // We don't have role here; fetch user role from participants array
        const participantRecord = chat.participants.find(
          (p) => p._id.toString() === userId.toString()
        );
        const isAdmin = participantRecord && participantRecord.role === "admin";
        if (!isCreator && !isAdmin) {
          socket.emit("error", {
            message: "Keine Berechtigung zum Umbenennen",
          });
          return;
        }
        const updated = await chatRepository.renameGroupChat(chatId, newName);
        if (!updated) {
          socket.emit("error", { message: "Fehler beim Umbenennen" });
          return;
        }
        // Broadcast rename to participants
        updated.participants.forEach((participant) => {
          io.to(`user:${participant._id}`).emit("chat-renamed", {
            chatId: updated._id,
            newName: updated.name,
          });
        });
        // Also notify room
        io.to(`chat:${chatId}`).emit("chat-renamed", {
          chatId: updated._id,
          newName: updated.name,
        });
      } catch (error) {
        console.error("Error renaming chat:", error);
        socket.emit("error", { message: "Fehler beim Umbenennen des Chats" });
      }
    });

    /**
     * Handle disconnect
     */
    socket.on("disconnect", () => {
      userSockets.delete(userId.toString());
    });
  });
}

module.exports = { initializeChatSocket };
