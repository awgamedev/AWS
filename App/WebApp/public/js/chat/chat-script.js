// Chat Client Script with Socket.IO
let socket;
let currentChatId = null;
let currentUserId = null;
let editingMessageId = null;
let quill; // Quill editor instance
let isRichMode = false; // default to simple mode now

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
    path: "/onis/socket.io",
    transports: ["websocket", "polling"],
  });

  setupSocketListeners();
  setupEventListeners();
  setupEditorModeToggle();
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
  // Emit typing event on input (after quill is initialized)
  quill.on("text-change", function () {
    if (currentChatId) {
      socket.emit("typing", { chatId: currentChatId });
    }
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

  // Setup fullscreen button
  setupFullscreenEditor();
}

// CSS-based pseudo fullscreen to avoid exiting after file dialogs
let isPseudoFullscreen = false;
function setupFullscreenEditor() {
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const editorWrapper = document.querySelector(".chat-editor-wrapper");

  if (!fullscreenBtn || !editorWrapper) return;

  fullscreenBtn.addEventListener("click", () => {
    isPseudoFullscreen = !isPseudoFullscreen;
    if (isPseudoFullscreen) {
      editorWrapper.classList.add("pseudo-fullscreen-editor");
      document.body.classList.add("fullscreen-active");
      fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      editorWrapper.classList.remove("pseudo-fullscreen-editor");
      document.body.classList.remove("fullscreen-active");
      fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
  });

  // Re-apply class after image insertion if still flagged
  quill.on("text-change", () => {
    if (
      isPseudoFullscreen &&
      !editorWrapper.classList.contains("pseudo-fullscreen-editor")
    ) {
      editorWrapper.classList.add("pseudo-fullscreen-editor");
    }
  });
}

function setupSocketListeners() {
  // Typing indicator
  let typingTimeout;
  socket.on("user-typing", ({ chatId, userId }) => {
    if (chatId === currentChatId && userId !== currentUserId) {
      showTypingIndicator();
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(hideTypingIndicator, 2000);
    }
  });

  function showTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
      indicator.style.display = "block";
      indicator.innerHTML = `<span class="typing-dots">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </span> schreibt...`;
    }
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
      indicator.style.display = "none";
      indicator.innerHTML = "";
    }
  }

  // Add CSS for animated dots
  const typingStyle = document.createElement("style");
  typingStyle.textContent = `
      .chat-typing-indicator {
        margin: 8px 0 0 12px;
        min-height: 24px;
        color: #666;
        font-size: 1em;
        display: flex;
        align-items: center;
        font-style: italic;
        user-select: none;
      }
      .typing-dots {
        display: inline-block;
        margin-right: 6px;
        vertical-align: middle;
      }
      .typing-dots .dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin: 0 1.5px;
        background: #888;
        border-radius: 50%;
        opacity: 0.5;
        animation: typing-bounce 1.2s infinite both;
      }
      .typing-dots .dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      .typing-dots .dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      @keyframes typing-bounce {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1.2); opacity: 1; }
      }
    `;
  document.head.appendChild(typingStyle);
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

  socket.on("message-deleted", ({ chatId, message }) => {
    if (chatId === currentChatId) {
      updateMessageInUI(message);
    }
  });

  socket.on("chat-updated", ({ chatId, lastMessage }) => {
    updateChatListItem(chatId, lastMessage);
  });

  socket.on("chat-renamed", ({ chatId, newName }) => {
    // Update list item
    const item = document.querySelector(
      `.chat-item[data-chat-id="${chatId}"] .chat-item-name`
    );
    if (item) item.textContent = newName;
    // Update header if open
    if (currentChatId === chatId) {
      const titleEl = document.getElementById("chatTitle");
      if (titleEl) titleEl.textContent = newName;
    }
  });

  socket.on("error", ({ message }) => {
    showNotification(message, "error");
  });
}

function setupEventListeners() {
  // Emit typing event for simple input
  const simpleInput = document.getElementById("simpleMessageInput");
  if (simpleInput) {
    simpleInput.addEventListener("input", function () {
      if (currentChatId) {
        socket.emit("typing", { chatId: currentChatId });
      }
    });
  }
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

  // Back button (mobile)
  const backBtn = document.getElementById("backToListBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      closeChat();
      // On mobile, show sidebar
      const sidebar = document.querySelector(".chat-sidebar");
      if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove("mobile-hidden");
      }
    });
  }

  // Send message
  const sendBtn = document.getElementById("sendMessageBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }
  const sendBtnRich = document.getElementById("sendMessageBtnRich");
  if (sendBtnRich) {
    sendBtnRich.addEventListener("click", sendMessage);
  }

  const renameBtn = document.getElementById("renameGroupBtn");
  if (renameBtn) {
    renameBtn.addEventListener("click", openRenameGroupModal);
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

  // On mobile, hide sidebar when opening chat
  const sidebar = document.querySelector(".chat-sidebar");
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.add("mobile-hidden");
  }

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

    // Show rename button if permitted
    const creatorId = activeChatItem.dataset.creatorId;
    const container = document.querySelector(".chat-container");
    const userRole = container ? container.dataset.userRole : null;
    const renameBtn = document.getElementById("renameGroupBtn");
    if (renameBtn) {
      if (
        chatType === "group" &&
        (creatorId === currentUserId || userRole === "admin")
      ) {
        renameBtn.style.display = "inline-flex";
      } else {
        renameBtn.style.display = "none";
      }
    }
  }

  // Join chat room and load messages
  socket.emit("join-chat", chatId);

  // Clear message input
  if (quill) {
    quill.setContents([]);
  }
  const simpleInput = document.getElementById("simpleMessageInput");
  if (simpleInput) simpleInput.value = "";
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
  const isOwnMessage =
    message.senderId && message.senderId._id === currentUserId;

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
  senderSpan.textContent =
    message.senderId && message.senderId.username
      ? message.senderId.username
      : "";

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

  if (message.isDeleted) {
    textDiv.innerHTML =
      '<span class="deleted-message-hint">Diese Nachricht wurde gelöscht.</span>';
    bubbleDiv.classList.add("deleted-message");
  } else {
    // Use innerHTML to render rich content (Quill HTML)
    textDiv.innerHTML = message.content;
  }

  bubbleDiv.appendChild(textDiv);

  if (message.edited && !message.isDeleted) {
    const editedSpan = document.createElement("span");
    editedSpan.className = "message-edited";
    editedSpan.textContent = "(bearbeitet)";
    bubbleDiv.appendChild(editedSpan);
  }

  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(bubbleDiv);

  // Add edit/delete buttons for own messages (not for deleted)
  if (isOwnMessage && !message.isDeleted) {
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
  if (!currentChatId) return;

  let content;
  if (isRichMode) {
    // Rich mode: HTML from Quill
    content = quill.root.innerHTML;
    const text = quill.getText().trim();
    if (!text || text === "") return;
  } else {
    // Simple mode: plain text input
    const inputEl = document.getElementById("simpleMessageInput");
    if (!inputEl) return;
    const raw = inputEl.value.trim();
    if (!raw) return;
    content = `<p>${escapeHtml(raw)}</p>`;
  }

  if (editingMessageId) {
    socket.emit("edit-message", {
      messageId: editingMessageId,
      content: content,
    });
    editingMessageId = null;
    document.getElementById("sendMessageBtn").innerHTML =
      '<i class="fas fa-paper-plane"></i>';
  } else {
    socket.emit("send-message", {
      chatId: currentChatId,
      content: content,
    });
  }

  // Clear appropriate editor
  if (isRichMode) {
    quill.setContents([]);
  } else {
    const inputEl = document.getElementById("simpleMessageInput");
    if (inputEl) inputEl.value = "";
  }
}

function startEditMessage(messageId, currentContent) {
  editingMessageId = messageId;

  // Set HTML content in Quill editor
  quill.root.innerHTML = currentContent;
  quill.focus();

  // Force rich mode for editing
  if (!isRichMode) {
    isRichMode = true;
    applyEditorMode();
  }

  // Change send button to edit icon
  document.getElementById("sendMessageBtn").innerHTML =
    '<i class="fas fa-check"></i>';
}

function deleteMessage(messageId) {
  if (confirm("Möchten Sie diese Nachricht wirklich löschen?")) {
    socket.emit("delete-message", { messageId });
  }
}

function updateMessageInUI(message, isDelete = false) {
  // Find the message element in the DOM
  const messageDiv = document.querySelector(
    `.message[data-message-id="${message._id}"]`
  );
  if (!messageDiv) return;

  // Replace with new element (to update content and deleted state)
  const newMessageDiv = createMessageElement(message);
  messageDiv.parentNode.replaceChild(newMessageDiv, messageDiv);
}

// No longer used: removeMessageFromUI
// Add CSS for deleted message hint
const deletedStyle = document.createElement("style");
deletedStyle.textContent = `
  .deleted-message-hint {
    color: #888;
    font-style: italic;
    font-size: 0.95em;
    user-select: none;
  }
  .deleted-message {
    background: #f5f5f5;
    border: 1px dashed #ccc;
  }
`;
document.head.appendChild(deletedStyle);

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
        textContent.substring(0, 20) + (textContent.length > 20 ? "..." : "");
    }

    // Move to top of list
    const chatList = document.getElementById("chatList");
    chatList.insertBefore(chatItem, chatList.firstChild);
  }
}

async function createDirectMessage(userId) {
  try {
    console.log("Creating direct message with user:", userId);
    const response = await fetch("chat/direct", {
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
    const response = await fetch("chat/group", {
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
    const response = await fetch(`chat/${chatId}`, {
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

function showNotification(message, type = "info", timeout = 4000) {
  const container =
    document.getElementById("toastContainer") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast-message ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = () => removeToast(toast);
  toast.appendChild(closeBtn);
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), timeout);
}

function createToastContainer() {
  const div = document.createElement("div");
  div.id = "toastContainer";
  document.body.appendChild(div);
  return div;
}

function removeToast(toast) {
  toast.style.animation = "toastOut .3s ease forwards";
  setTimeout(() => toast.remove(), 300);
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

// --- Editor Mode Toggle ---
function setupEditorModeToggle() {
  const simpleToggle = document.getElementById("editorModeToggle");
  const richToggle = document.getElementById("editorModeToggleRich");
  if (simpleToggle) {
    simpleToggle.addEventListener("click", () => {
      isRichMode = true;
      applyEditorMode();
    });
  }
  if (richToggle) {
    richToggle.addEventListener("click", () => {
      isRichMode = false;
      applyEditorMode();
    });
  }
  applyEditorMode();
}

function applyEditorMode() {
  const container = document.querySelector(".chat-input-container");
  const simpleRow = document.getElementById("simpleRow");
  const editorWrapper = document.querySelector(".chat-editor-wrapper");
  const simpleToggle = document.getElementById("editorModeToggle");
  const richToggle = document.getElementById("editorModeToggleRich");
  if (!container) return;
  if (isRichMode) {
    container.classList.remove("simple-mode");
    container.classList.add("rich-mode");
    if (simpleRow) simpleRow.style.display = "none";
    if (editorWrapper) editorWrapper.style.display = "flex";
    if (simpleToggle) simpleToggle.classList.add("active");
    if (richToggle) richToggle.classList.remove("active");
  } else {
    container.classList.remove("rich-mode");
    container.classList.add("simple-mode");
    if (simpleRow) simpleRow.style.display = "flex";
    if (editorWrapper) editorWrapper.style.display = "none";
    if (simpleToggle) simpleToggle.classList.remove("active");
    if (richToggle) richToggle.classList.add("active");
  }
}

// Rename group chat modal logic
function openRenameGroupModal() {
  const modal = document.getElementById("renameGroupModal");
  const input = document.getElementById("renameGroupInput");
  if (!modal || !input || !currentChatId) return;
  // Prefill with current name
  const chatItem = document.querySelector(
    `.chat-item[data-chat-id="${currentChatId}"] .chat-item-name`
  );
  input.value = chatItem ? chatItem.textContent.trim() : "";
  modal.style.display = "flex";
}
function closeRenameGroupModal() {
  const modal = document.getElementById("renameGroupModal");
  if (modal) modal.style.display = "none";
}
function submitRenameGroup() {
  const input = document.getElementById("renameGroupInput");
  if (!input || !currentChatId) return;
  const newName = input.value.trim();
  if (!newName) {
    showNotification("Name darf nicht leer sein", "error");
    return;
  }
  socket.emit("rename-chat", { chatId: currentChatId, newName });
  closeRenameGroupModal();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
