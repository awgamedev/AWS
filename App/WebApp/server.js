/**
 * Simple Node.js Web Server Entry Point
 * * This file loads the Express app and starts the server listener.
 */
const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");
const { initializeChatSocket } = require("./src/features/chat/chat.socket");
const session = require("express-session");

// Define the port the server will listen on
const PORT = process.env.PORT;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: `http://localhost:${PORT}`,
    credentials: true,
  },
});

// Share session with socket.io
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "a-strong-default-secret",
  resave: false,
  saveUninitialized: false,
});

io.engine.use(sessionMiddleware);

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
