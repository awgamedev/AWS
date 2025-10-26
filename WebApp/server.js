/**
 * Simple Node.js Web Server using Express
 *
 * To run this file, you must first have Node.js and Express installed:
 * 1. Initialize a project: npm init -y
 * 2. Install Express: npm install express
 * 3. Run the server: node server.js
 */
const express = require("express");

// Define the port the server will listen on
const PORT = 3000;

// Initialize the Express application
const app = express();

// --- Routes ---

// Default route (GET /)
app.get("/", (req, res) => {
  // We send a complete HTML document as the response
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Node.js Simple App</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                background-color: #e0f7fa; /* Light cyan background */
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .card {
                background: white;
                padding: 40px 60px;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                text-align: center;
                transition: transform 0.3s ease;
            }
            .card:hover {
                transform: translateY(-5px);
            }
            h1 {
                color: #00796b; /* Teal color */
                font-size: 2.5em;
                margin-bottom: 10px;
            }
            p {
                color: #546e7a;
                font-size: 1.1em;
            }
            .info {
                margin-top: 20px;
                font-size: 0.9em;
                color: #a7b7c2;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Server is Running!</h1>
            <p>This is a successful response from your Node.js Express server.</p>
            <div class="info">
                The current path requested is: ${req.path}
            </div>
        </div>
    </body>
    </html>
  `);
});

// A simple API route (GET /api/status)
app.get("/api/status", (req, res) => {
  // Send a JSON response for an API endpoint
  res.json({
    status: "ok",
    message: "The server is healthy and responding.",
    timestamp: new Date().toISOString(),
  });
});

// --- Server Startup ---

// Start the server and listen on the defined port
app.listen(PORT, () => {
  console.log(`✅ Server is now running at http://localhost:${PORT}`);
  console.log(
    `Try accessing the status API at http://localhost:${PORT}/api/status`
  );
});
