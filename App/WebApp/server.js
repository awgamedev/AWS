/**
 * Simple Node.js Web Server Entry Point
 * * This file loads the Express app and starts the server listener.
 */
const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const { initializeChatSocket } = require("./src/features/chat/chat.socket");

// Define the port the server will listen on
const PORT = process.env.PORT;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: `http://localhost:${PORT}`,
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Get the session middleware from app
const sessionMiddleware = app.get("sessionMiddleware");

// Wrap session middleware for Socket.IO
io.engine.use((req, res, next) => {
  sessionMiddleware(req, res, next);
});

// Initialize chat socket handlers
initializeChatSocket(io);

// Make io accessible to routes if needed
app.set("io", io);

// Start the server and listen on the defined port
server.listen(PORT, () => {
  console.log(`✅ Server is now running at http://localhost:${PORT}`);
  console.log(
    `Try accessing the status API at http://localhost:${PORT}/api/status`
  );
  console.log(`🔌 Socket.IO is ready for real-time chat`);
});
