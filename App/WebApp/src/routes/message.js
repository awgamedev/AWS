const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const generateLayout = require("../utils/layout"); // <--- IMPORT THE LAYOUT

const passport = require("passport"); // Wichtig für den Aufruf der Authentifizierung
const { ensureAuthenticated, checkRole } = require("../middleware/auth"); // <-- NUR IMPORTIEREN!

// --- Route: Submit Message Form (GET /message) ---
router.get("/message", ensureAuthenticated, (req, res) => {
  const username = req.user.username || ""; // req.user sollte von Passport gesetzt sein

  const content = `
            <h2>Submitt Your Message</h2>
            <p>Eingeloggt als: <strong>${username}</strong></p> 
            <form action="/message" method="POST">
                <label for="username" style="display: block; margin-top: 15px; font-weight: bold;">Your Name:</label>
                <input type="text" id="username" name="username" value="${username}" required style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" readonly>
                
                <label for="message" style="display: block; margin-top: 15px; font-weight: bold;">Message:</label>
                <textarea id="message" name="message" rows="4" required style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"></textarea>
                
                <button type="submit" style="background-color: #00796b; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px; font-size: 1em;">Save to MongoDB</button>
            </form>
            <div style="margin-top: 20px; display: block; text-align: center;"><a href="/messages">View All Messages →</a></div>
        `;

  // Use the layout function
  res.send(generateLayout("Submit a Message", content, req.path));
});

// --- Route: Handle Form Submission (POST /message) ---
router.post("/message", async (req, res) => {
  try {
    const { username, message } = req.body;
    if (!username || !message) {
      return res
        .status(400)
        .send(
          generateLayout(
            "Error",
            "<h2>Error</h2><p>Username and message are required.</p><p><a href='/message'>Go Back</a></p>",
            req.path
          )
        );
    }
    const newMessage = new Message({ username, message });
    await newMessage.save();

    const successContent = `
            <h2>✅ Success!</h2>
            <p>Message from **${username}** stored successfully in MongoDB!</p>
            <p>
                <a href="/message">Submit another message</a> | 
                <a href="/messages">View All Messages</a>
            </p>
        `;
    res.send(generateLayout("Success", successContent, req.path));
  } catch (error) {
    console.error("Error saving message:", error);
    res
      .status(500)
      .send(
        generateLayout(
          "Error",
          "<h2>Server Error</h2><p>An error occurred while saving the data.</p><p><a href='/message'>Go Back</a></p>",
          req.path
        )
      );
  }
});

// --- Route: List All Messages (GET /messages) ---
router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ createdAt: -1 });

    let listItems = "";
    if (messages.length === 0) {
      listItems = "<p>No messages found in the database.</p>";
    } else {
      const items = messages.map((msg) => {
        const formattedDate = new Date(msg.createdAt).toLocaleString();
        return `
                    <li>
                        <strong>User:</strong> ${msg.username} <br>
                        <strong>Message:</strong> ${msg.message} <br>
                        <small style="color: #888; font-size: 0.8em;">Submitted on: ${formattedDate}</small>
                    </li>
                `;
      });
      listItems = `<ul style="list-style: none; padding: 0;">${items.join(
        ""
      )}</ul>`;
    }

    const content = `
            <h2>All Stored Messages</h2>
            <a href="/message" style="display: block; margin-bottom: 20px;">← Go to Submission Form</a>
            ${listItems}
        `;

    const styles = `
            li { border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 5px; background-color: #ffffff; }
            li strong { color: #00796b; }
        `;

    // Use the layout function
    res.send(generateLayout("All Stored Messages", content, req.path, styles));
  } catch (error) {
    console.error("Error fetching messages:", error);
    res
      .status(500)
      .send(
        generateLayout(
          "Error",
          "<h2>Server Error</h2><p>An error occurred while retrieving messages.</p><p><a href='/'>Go Home</a></p>",
          req.path
        )
      );
  }
});

// Export the router
module.exports = router;
