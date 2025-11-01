/**
 * Simple Node.js Web Server Entry Point
 * * This file loads the Express app and starts the server listener.
 */
const app = require("./app");

// Define the port the server will listen on
const PORT = process.env.PORT;

// Start the server and listen on the defined port
app.listen(PORT, () => {
  console.log(`✅ Server is now running at http://localhost:${PORT}`);
  console.log(
    `Try accessing the status API at http://localhost:${PORT}/api/status`
  );
});
