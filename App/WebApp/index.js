const express = require("express");
const router = express.Router();
const generateLayout = require("./src/utils/layout"); // <--- IMPORT THE LAYOUT

// --- Route: Home Page (GET /) ---
router.get("/", (req, res) => {
  const itemCount = 5;

  const welcome = req.__("WELCOME_MESSAGE");
  const items = req.__("ITEMS_FOUND", itemCount);

  const content = `
        <h1>Server is Running!</h1>
        <h1>${welcome}</h1><p>${items}</p>
        <p>This is a successful response from your Node.js Express server.</p>
        <p>
            <a href="/message">Submit a Message</a> | 
            <a href="/messages">View All Messages</a>
        </p>
        <div class="info" style="margin-top: 20px; font-size: 0.9em; color: #a7b7c2;">
            The current path requested is: ${req.path}
        </div>
    `;

  // Use the layout function to wrap the content
  const styles = `
        /* Specific styles for the home card */
        .container { text-align: center; }
    `;
  res.send(generateLayout("Node.js Simple App", content, styles));
});

// --- A simple API route (GET /api/status) ---
// API routes do not need the HTML layout
router.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "The server is healthy and responding.",
    timestamp: new Date().toISOString(),
  });
});

// Export the router
module.exports = router;
