# Routes Instructions

This file provides instructions for managing routes in the application. It outlines best practices for defining, organizing, and maintaining routes to ensure a clean and efficient routing system.

## General Guidelines

- Define routes in the `src/routes` directory.
- Avoid embedding HTML directly in route files; use EJS views instead.
- Refactor business logic into controllers located in the `src/controllers` directory instead of placing it in route files.
- Keep route definitions concise and focused on routing logic only.
- Use descriptive names for route handlers to improve readability.
- When rendering views, use a dedicated utility function (e.g., `renderView`) to handle common rendering tasks and pass necessary variables to the views.
- Group related routes together in the same file for better organization.
- Use middleware functions from the `src/middleware` directory to handle common tasks such as authentication, validation, and logging.
- Ensure that all routes are properly documented with comments explaining their purpose and functionality.
- Follow RESTful conventions for route naming and HTTP methods where applicable.
- Implement error handling for routes to manage unexpected situations gracefully.

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

// Define a GET route
router.get("/example", exampleController.handleExample);
module.exports = router;
```
