// Chat Client Script with Socket.IO
let socket;
let currentChatId = null;
let currentUserId = null;
let editingMessageId = null;
let quill; // Quill editor instance

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  initializeChat();
});

function initializeChat() {
  // Get current user ID from the page
  const userElement = document.querySelector(
    ".chat-container[data-current-user-id]"
  );
  if (userElement) {
    currentUserId = userElement.dataset.currentUserId;
  }

  // Initialize Quill editor
  initializeQuillEditor();

  // Initialize Socket.IO connection
  socket = io({
    transports: ["websocket", "polling"],
  });

  setupSocketListeners();
  setupEventListeners();
}

function initializeQuillEditor() {
  // Configure Quill with custom image handler
  quill = new Quill("#messageInput", {
    theme: "snow",
    modules: {
      toolbar: {
        container: "#toolbar",
        handlers: {
          image: imageHandler,
        },
      },
    },
    placeholder: "Nachricht eingeben...",
  });

  // Custom image handler for base64 encoding
  function imageHandler() {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showNotification("Bild ist zu groß (max 5MB)", "error");
          return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", e.target.result);
          quill.setSelection(range.index + 1);
        };
        reader.readAsDataURL(file);
      }
    };
  }

  // Submit on Ctrl+Enter
  quill.root.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

function setupSocketListeners() {
  // Connection events
  socket.on("connect", () => {
    console.log("✅ Connected to chat server");
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected from chat server");
  });

  // Chat events
  socket.on("chat-history", ({ chatId, messages }) => {
    if (chatId === currentChatId) {
      displayMessages(messages);
    }
  });

  socket.on("new-message", ({ chatId, message }) => {
    if (chatId === currentChatId) {
      appendMessage(message);
      scrollToBottom();
    }
    updateChatListItem(chatId, message);
  });

  socket.on("message-edited", ({ chatId, message }) => {
    if (chatId === currentChatId) {
      updateMessageInUI(message);
    }
  });

  socket.on("message-deleted", ({ chatId, messageId }) => {
    if (chatId === currentChatId) {
      removeMessageFromUI(messageId);
    }
  });

  socket.on("chat-updated", ({ chatId, lastMessage }) => {
    updateChatListItem(chatId, lastMessage);
  });

  socket.on("error", ({ message }) => {
    showNotification(message, "error");
  });
}

function setupEventListeners() {
  // Chat item click - open chat
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.addEventListener("click", function () {
      const chatId = this.dataset.chatId;
      openChat(chatId);
    });
  });

  // User item click - create/open direct message
  document.querySelectorAll(".user-item").forEach((item) => {
    item.addEventListener("click", function () {
      const userId = this.dataset.userId;
      createDirectMessage(userId);
    });
  });

  // Create group button
  const createGroupBtn = document.getElementById("createGroupBtn");
  if (createGroupBtn) {
    createGroupBtn.addEventListener("click", openCreateGroupModal);
  }

  // Close chat button
  const closeChatBtn = document.getElementById("closeChatBtn");
  if (closeChatBtn) {
    closeChatBtn.addEventListener("click", closeChat);
  }

  // Send message
  const sendBtn = document.getElementById("sendMessageBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  // Delete chat buttons
  document.querySelectorAll(".btn-delete-chat").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent opening chat
      const chatId = this.dataset.chatId;
      deleteChat(chatId);
    });
  });

  // Search functionality
  const searchInput = document.getElementById("chatSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      filterChats(searchTerm);
    });
  }
}

function openChat(chatId) {
  currentChatId = chatId;

  // Leave previous chat room
  if (currentChatId) {
    socket.emit("leave-chat", currentChatId);
  }

  // Update UI
  document.getElementById("welcomeScreen").style.display = "none";
  document.getElementById("chatWindow").style.display = "flex";

  // Update active chat in sidebar
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });
  const activeChatItem = document.querySelector(
    `.chat-item[data-chat-id="${chatId}"]`
  );
  if (activeChatItem) {
    activeChatItem.classList.add("active");

    // Update chat header
    const chatName =
      activeChatItem.querySelector(".chat-item-name").textContent;
    document.getElementById("chatTitle").textContent = chatName;

    const chatType = activeChatItem.dataset.chatType;
    document.getElementById("chatSubtitle").textContent =
      chatType === "group" ? "Gruppenchat" : "Direktnachricht";
  }

  // Join chat room and load messages
  socket.emit("join-chat", chatId);

  // Clear message input
  document.getElementById("messageInput").value = "";
}

function closeChat() {
  if (currentChatId) {
    socket.emit("leave-chat", currentChatId);
  }

  currentChatId = null;
  document.getElementById("chatWindow").style.display = "none";
  document.getElementById("welcomeScreen").style.display = "flex";

  // Remove active state
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });
}

function displayMessages(messages) {
  const messagesContainer = document.getElementById("chatMessages");
  messagesContainer.innerHTML = "";

  messages.forEach((message) => {
    appendMessage(message, false);
  });

  scrollToBottom();
}

function appendMessage(message, animate = true) {
  const messagesContainer = document.getElementById("chatMessages");
  const messageDiv = createMessageElement(message);

  if (!animate) {
    messageDiv.style.animation = "none";
  }

  messagesContainer.appendChild(messageDiv);
}

function createMessageElement(message) {
  const isOwnMessage = message.senderId._id === currentUserId;

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isOwnMessage ? "own-message" : ""}`;
  messageDiv.dataset.messageId = message._id;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  // Message header (sender and time)
  const headerDiv = document.createElement("div");
  headerDiv.className = "message-header";

  const senderSpan = document.createElement("span");
  senderSpan.className = "message-sender";
  senderSpan.textContent = message.senderId.username;

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.textContent = formatMessageTime(message.createdAt);

  headerDiv.appendChild(senderSpan);
  headerDiv.appendChild(timeSpan);

  // Message bubble
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";

  const textDiv = document.createElement("div");
  textDiv.className = "message-text";
  // Use innerHTML to render rich content (Quill HTML)
  textDiv.innerHTML = message.content;

  bubbleDiv.appendChild(textDiv);

  if (message.edited) {
    const editedSpan = document.createElement("span");
    editedSpan.className = "message-edited";
    editedSpan.textContent = "(bearbeitet)";
    bubbleDiv.appendChild(editedSpan);
  }

  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(bubbleDiv);

  // Add edit/delete buttons for own messages
  if (isOwnMessage) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "message-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "message-action-btn edit";
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.onclick = () => startEditMessage(message._id, message.content);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "message-action-btn delete";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = () => deleteMessage(message._id);

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    contentDiv.appendChild(actionsDiv);
  }

  messageDiv.appendChild(contentDiv);
  return messageDiv;
}

function sendMessage() {
  // Get HTML content from Quill
  const content = quill.root.innerHTML;

  // Check if there's actual content (Quill uses <p><br></p> for empty)
  const text = quill.getText().trim();
  if (!text || !currentChatId) return;

  if (editingMessageId) {
    // Edit existing message
    socket.emit("edit-message", {
      messageId: editingMessageId,
      content: content,
    });
    editingMessageId = null;
    document.getElementById("sendMessageBtn").innerHTML =
      '<i class="fas fa-paper-plane"></i>';
  } else {
    // Send new message
    socket.emit("send-message", {
      chatId: currentChatId,
      content: content,
    });
  }

  // Clear editor
  quill.setContents([]);
}

function startEditMessage(messageId, currentContent) {
  editingMessageId = messageId;

  // Set HTML content in Quill editor
  quill.root.innerHTML = currentContent;
  quill.focus();

  // Change send button to edit icon
  document.getElementById("sendMessageBtn").innerHTML =
    '<i class="fas fa-check"></i>';
}

function deleteMessage(messageId) {
  if (confirm("Möchten Sie diese Nachricht wirklich löschen?")) {
    socket.emit("delete-message", { messageId });
  }
}

function updateMessageInUI(message) {
  const messageElement = document.querySelector(
    `.message[data-message-id="${message._id}"]`
  );
  if (messageElement) {
    const textElement = messageElement.querySelector(".message-text");
    textElement.innerHTML = message.content;

    // Add or update edited indicator
    let editedSpan = messageElement.querySelector(".message-edited");
    if (!editedSpan) {
      editedSpan = document.createElement("span");
      editedSpan.className = "message-edited";
      editedSpan.textContent = "(bearbeitet)";
      messageElement.querySelector(".message-bubble").appendChild(editedSpan);
    }
  }
}

function removeMessageFromUI(messageId) {
  const messageElement = document.querySelector(
    `.message[data-message-id="${messageId}"]`
  );
  if (messageElement) {
    messageElement.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => messageElement.remove(), 300);
  }
}

function updateChatListItem(chatId, lastMessage) {
  const chatItem = document.querySelector(
    `.chat-item[data-chat-id="${chatId}"]`
  );
  if (chatItem) {
    const preview = chatItem.querySelector(".chat-item-preview");
    if (preview) {
      // Strip HTML tags for preview
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = lastMessage.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      preview.textContent =
        textContent.substring(0, 40) + (textContent.length > 40 ? "..." : "");
    }

    // Move to top of list
    const chatList = document.getElementById("chatList");
    chatList.insertBefore(chatItem, chatList.firstChild);
  }
}

async function createDirectMessage(userId) {
  try {
    console.log("Creating direct message with user:", userId);
    const response = await fetch("/chat/direct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response error:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      // Check if chat already exists in list
      let chatItem = document.querySelector(
        `.chat-item[data-chat-id="${data.chat._id}"]`
      );

      if (!chatItem) {
        // Add new chat to list
        addChatToList(data.chat);
      }

      // Open the chat
      openChat(data.chat._id);
    } else {
      showNotification(data.error, "error");
    }
  } catch (error) {
    console.error("Error creating direct message:", error);
    console.error("Error details:", error.message, error.stack);
    showNotification(
      "Fehler beim Erstellen der Direktnachricht: " + error.message,
      "error"
    );
  }
}

function openCreateGroupModal() {
  document.getElementById("createGroupModal").style.display = "flex";
}

function closeCreateGroupModal() {
  document.getElementById("createGroupModal").style.display = "none";
  document.getElementById("groupName").value = "";
  document
    .querySelectorAll(".participant-checkbox")
    .forEach((cb) => (cb.checked = false));
}

async function createGroup() {
  const name = document.getElementById("groupName").value.trim();
  const checkboxes = document.querySelectorAll(".participant-checkbox:checked");
  const participants = Array.from(checkboxes).map((cb) => cb.value);

  if (!name) {
    showNotification("Bitte geben Sie einen Gruppennamen ein", "error");
    return;
  }

  if (participants.length === 0) {
    showNotification(
      "Bitte wählen Sie mindestens einen Teilnehmer aus",
      "error"
    );
    return;
  }

  try {
    console.log(
      "Creating group with name:",
      name,
      "participants:",
      participants
    );
    const response = await fetch("/chat/group", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, participants }),
    });

    console.log("Group response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Group response error:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Group response data:", data);

    if (data.success) {
      closeCreateGroupModal();
      addChatToList(data.chat);
      openChat(data.chat._id);
      showNotification("Gruppe erfolgreich erstellt", "success");
    } else {
      showNotification(data.error, "error");
    }
  } catch (error) {
    console.error("Error creating group:", error);
    console.error("Error details:", error.message, error.stack);
    showNotification(
      "Fehler beim Erstellen der Gruppe: " + error.message,
      "error"
    );
  }
}

async function deleteChat(chatId) {
  if (!confirm("Möchten Sie diesen Chat wirklich löschen?")) {
    return;
  }

  try {
    const response = await fetch(`/chat/${chatId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (data.success) {
      // Remove from UI
      const chatItem = document.querySelector(
        `.chat-item[data-chat-id="${chatId}"]`
      );
      if (chatItem) {
        chatItem.remove();
      }

      // Close if currently open
      if (currentChatId === chatId) {
        closeChat();
      }

      showNotification("Chat erfolgreich gelöscht", "success");
    } else {
      showNotification(data.error, "error");
    }
  } catch (error) {
    console.error("Error deleting chat:", error);
    showNotification("Fehler beim Löschen des Chats", "error");
  }
}

function addChatToList(chat) {
  const chatList = document.getElementById("chatList");
  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";
  chatItem.dataset.chatId = chat._id;
  chatItem.dataset.chatType = chat.type;

  let chatName = chat.name;
  if (chat.type === "direct") {
    const otherUser = chat.participants.find((p) => p._id !== currentUserId);
    chatName = otherUser ? otherUser.username : "User";
  }

  chatItem.innerHTML = `
        <div class="chat-item-avatar">
            ${
              chat.type === "group"
                ? '<i class="fas fa-users"></i>'
                : `<div class="user-initials">${chatName
                    .substring(0, 2)
                    .toUpperCase()}</div>`
            }
        </div>
        <div class="chat-item-content">
            <div class="chat-item-header">
                <span class="chat-item-name">${chatName}</span>
            </div>
        </div>
    `;

  chatItem.addEventListener("click", () => openChat(chat._id));
  chatList.insertBefore(chatItem, chatList.firstChild);
}

function filterChats(searchTerm) {
  document.querySelectorAll(".chat-item").forEach((item) => {
    const name = item
      .querySelector(".chat-item-name")
      .textContent.toLowerCase();
    if (name.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return "Jetzt";
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `vor ${minutes} Min.`;
  }

  // Today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // This year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  // Older
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function scrollToBottom() {
  const messagesContainer = document.getElementById("chatMessages");
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showNotification(message, type = "info") {
  // Simple notification (you can enhance this with a proper notification library)
  alert(message);
}

// Add CSS for fade out animation
const style = document.createElement("style");
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
`;
document.head.appendChild(style);
