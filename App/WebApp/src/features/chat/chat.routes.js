const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../../middleware/auth");
const { renderView } = require("../../utils/view-renderer");
const { chatRepository, messageRepository } = require("./chat.repository");

/**
 * GET /chat - Main chat interface
 */
router.get("/chat", ensureAuthenticated, async (req, res) => {
  const title = "Chat";
  const specificStyles = '<link rel="stylesheet" href="/css/chat.css">';

  try {
    // Get all users for the sidebar
    const allUsers = await chatRepository.getAllUsers();

    // Get user's chats
    const userChats = await chatRepository.findByUserId(req.user.id);

    renderView(
      req,
      res,
      "chat",
      title,
      {
        allUsers,
        userChats,
        currentUserId: req.user.id,
        userRole: req.user.role,
      },
      specificStyles
    );
  } catch (error) {
    console.error("Error loading chat:", error);
    return renderView(
      req,
      res,
      "error_message",
      "Error",
      {
        message: "Error loading chat interface.",
      },
      "",
      500
    );
  }
});

/**
 * POST /chat/group - Create a new group chat
 */
router.post("/chat/group", ensureAuthenticated, async (req, res) => {
  console.log("📨 POST /chat/group - Request received");
  console.log("User:", req.user?.id, req.user?.username);
  console.log("Body:", req.body);

  try {
    const { name, participants } = req.body;

    if (!name || !name.trim()) {
      console.log("❌ No group name provided");
      return res.status(400).json({ error: "Group name is required" });
    }

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      console.log("❌ No participants provided");
      return res
        .status(400)
        .json({ error: "At least one participant is required" });
    }

    console.log(
      "✅ Creating group chat:",
      name,
      "with participants:",
      participants
    );
    const chat = await chatRepository.createGroupChat(
      name.trim(),
      req.user.id,
      participants
    );

    console.log("✅ Group chat created:", chat._id);
    res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error("❌ Error creating group chat:", error);
    res.status(500).json({ error: "Error creating group chat" });
  }
});

/**
 * POST /chat/direct - Create or get a direct message chat
 */
router.post("/chat/direct", ensureAuthenticated, async (req, res) => {
  console.log("📨 POST /chat/direct - Request received");
  console.log("User:", req.user?.id, req.user?.username);
  console.log("Body:", req.body);

  try {
    const { userId } = req.body;

    if (!userId) {
      console.log("❌ No userId provided");
      return res.status(400).json({ error: "User ID is required" });
    }

    if (userId === req.user.id.toString()) {
      console.log("❌ Trying to chat with self");
      return res
        .status(400)
        .json({ error: "Cannot create chat with yourself" });
    }

    console.log(
      "✅ Creating/getting direct chat between",
      req.user.id,
      "and",
      userId
    );
    const chat = await chatRepository.getOrCreateDirectChat(
      req.user.id,
      userId
    );

    console.log("✅ Chat created/retrieved:", chat._id);
    res.json({ success: true, chat });
  } catch (error) {
    console.error("❌ Error creating direct chat:", error);
    res.status(500).json({ error: "Error creating direct chat" });
  }
});

/**
 * DELETE /chat/:chatId - Delete a group chat
 */
router.delete("/chat/:chatId", ensureAuthenticated, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Get the chat
    const chat = await chatRepository.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Verify user is creator or admin
    const isCreator = chat.creatorId._id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Only the creator or an admin can delete this chat" });
    }

    // Don't allow deleting direct chats
    if (chat.type === "direct") {
      return res
        .status(400)
        .json({ error: "Cannot delete direct message chats" });
    }

    await chatRepository.deleteChat(chatId);

    res.json({ success: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Error deleting chat" });
  }
});

/**
 * GET /chat/:chatId/messages - Get messages for a chat
 */
router.get("/chat/:chatId/messages", ensureAuthenticated, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify user is a participant
    const chat = await chatRepository.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === req.user.id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: "Not a participant in this chat" });
    }

    const messages = await messageRepository.findByChatId(chatId);

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

module.exports = router;
