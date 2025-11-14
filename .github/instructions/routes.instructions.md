# Routes Instructions

This file provides instructions for managing routes in the application. It outlines best practices for defining, organizing, and maintaining routes to ensure a clean and efficient routing system.

## General Guidelines

- Define routes in the `src/routes` directory.
- Use descriptive names for route handlers to improve readability.
- When rendering views, use a dedicated utility function (e.g., `renderView`) to handle common rendering tasks and pass necessary variables to the views.
- Group related routes together in the same file for better organization.
- Use middleware functions from the `src/middleware` directory to handle common tasks such as authentication, validation, and logging.
- Ensure that all routes are properly documented with comments explaining their purpose and functionality.
- Follow RESTful conventions for route naming and HTTP methods where applicable.
- Implement error handling for routes to manage unexpected situations gracefully.
- If certain logic should be refactored to another file, add sections at the bottom of the file. These sections should suggest a file path, where these Locic should be moved to. For Example Controllers, Views (ejs files), Services, Utilities, Middleware, etc.

## Example Structure

```javascript
// src/routes/exampleRoute.js

const express = require("express");
const router = express.Router();
const exampleController = require("../controllers/exampleController");
const { renderView } = require("../utils/view-renderer");

router.get("/register", (req, res) => {
  renderView(req, res, "register", "Registrierung", {
    // Variables for the inner view
    error: req.flash("error"),
    formData: req.flash("formData")[0] || {},
  });
});

router.get("/example", exampleController.handleExample);

// Define a GET route
module.exports = router;

// Additional logic can be refactored to:
// - src/models/exampleModel.js
// ...

// - src/services/exampleService.js
// ...

// - src/views/exampleView.ejs
// ...

// - src/controllers/exampleController.js
export const handleExample = (req, res) => {
  // Controller logic here
};

// - src/middleware/exampleMiddleware.js
// ...

// - src/utils/view-renderer.js
// ...
```
