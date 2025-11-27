const Chat = require("./chat.model");
const Message = require("./message.model");
const User = require("../user/user.model");

/**
 * Repository for Chat operations
 */
class ChatRepository {
  /**
   * Find all chats for a specific user
   */
  async findByUserId(userId) {
    try {
      return await Chat.find({ participants: userId })
        .populate("participants", "username email role")
        .populate("creatorId", "username")
        .populate({
          path: "lastMessage",
          populate: { path: "senderId", select: "username" },
        })
        .sort({ lastMessageAt: -1 })
        .lean();
    } catch (error) {
      throw new Error(`Error finding chats: ${error.message}`);
    }
  }

  /**
   * Find a chat by ID
   */
  async findById(chatId) {
    try {
      return await Chat.findById(chatId)
        .populate("participants", "username email role")
        .populate("creatorId", "username")
        .lean();
    } catch (error) {
      throw new Error(`Error finding chat: ${error.message}`);
    }
  }

  /**
   * Create a new group chat
   */
  async createGroupChat(name, creatorId, participantIds) {
    try {
      const chat = new Chat({
        name,
        type: "group",
        creatorId,
        participants: [...new Set([creatorId, ...participantIds])],
      });
      const saved = await chat.save();
      return await this.findById(saved._id);
    } catch (error) {
      throw new Error(`Error creating group chat: ${error.message}`);
    }
  }

  /**
   * Create or find a direct message chat
   */
  async getOrCreateDirectChat(userId1, userId2) {
    try {
      // Check if direct chat already exists
      const existing = await Chat.findOne({
        type: "direct",
        participants: { $all: [userId1, userId2], $size: 2 },
      })
        .populate("participants", "username email role")
        .populate("creatorId", "username")
        .lean();

      if (existing) {
        return existing;
      }

      // Create new direct chat
      const chat = new Chat({
        type: "direct",
        creatorId: userId1,
        participants: [userId1, userId2],
      });
      const saved = await chat.save();
      return await this.findById(saved._id);
    } catch (error) {
      throw new Error(`Error getting/creating direct chat: ${error.message}`);
    }
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId) {
    try {
      // Delete all messages in the chat
      await Message.deleteMany({ chatId });
      // Delete the chat itself
      return await Chat.findByIdAndDelete(chatId);
    } catch (error) {
      throw new Error(`Error deleting chat: ${error.message}`);
    }
  }

  /**
   * Update last message info
   */
  async updateLastMessage(chatId, messageId) {
    try {
      return await Chat.findByIdAndUpdate(
        chatId,
        {
          lastMessage: messageId,
          lastMessageAt: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error updating last message: ${error.message}`);
    }
  }

  /**
   * Get all users for the user list
   */
  async getAllUsers() {
    try {
      return await User.find({}, "username email role").lean();
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  /**
   * Rename a group chat
   */
  async renameGroupChat(chatId, newName) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return null;
      if (chat.type !== "group")
        throw new Error("Cannot rename non-group chat");
      chat.name = newName.trim();
      await chat.save();
      return await this.findById(chatId);
    } catch (error) {
      throw new Error(`Error renaming group chat: ${error.message}`);
    }
  }
}

/**
 * Repository for Message operations
 */
class MessageRepository {
  /**
   * Get messages for a specific chat
   */
  async findByChatId(chatId, limit = 100) {
    try {
      const messages = await Message.find({ chatId })
        .populate("senderId", "username email")
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();
      // Ensure isDeleted is present for all messages (for legacy data)
      return messages.map((msg) => ({
        ...msg,
        isDeleted: typeof msg.isDeleted === "boolean" ? msg.isDeleted : false,
      }));
    } catch (error) {
      throw new Error(`Error finding messages: ${error.message}`);
    }
  }

  /**
   * Create a new message
   */
  async createMessage(chatId, senderId, content) {
    try {
      const message = new Message({
        chatId,
        senderId,
        content,
      });
      const saved = await message.save();
      return await Message.findById(saved._id)
        .populate("senderId", "username email")
        .lean();
    } catch (error) {
      throw new Error(`Error creating message: ${error.message}`);
    }
  }

  /**
   * Update a message
   */
  async updateMessage(messageId, content) {
    try {
      return await Message.findByIdAndUpdate(
        messageId,
        {
          content,
          edited: true,
          editedAt: new Date(),
        },
        { new: true }
      )
        .populate("senderId", "username email")
        .lean();
    } catch (error) {
      throw new Error(`Error updating message: ${error.message}`);
    }
  }

  /**
   * Soft-delete a message (set isDeleted, clear content)
   */
  async deleteMessage(messageId) {
    try {
      return await Message.findByIdAndUpdate(
        messageId,
        {
          content: "",
          isDeleted: true,
          edited: true,
          editedAt: new Date(),
        },
        { new: true }
      )
        .populate("senderId", "username email")
        .lean();
    } catch (error) {
      throw new Error(`Error deleting message: ${error.message}`);
    }
  }

  /**
   * Find a message by ID
   */
  async findById(messageId) {
    try {
      return await Message.findById(messageId).lean();
    } catch (error) {
      throw new Error(`Error finding message: ${error.message}`);
    }
  }
}

module.exports = {
  chatRepository: new ChatRepository(),
  messageRepository: new MessageRepository(),
};
