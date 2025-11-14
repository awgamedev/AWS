# JavaScript Code Style for public/js Directory

This file describes the JavaScript code style for the public/js directory.

## General structure of a JavaScript file

- Use `//` for single-line comments.
- Use `/* ... */` for multi-line comments.
- Group related code into sections with clear comment headers.
- Use consistent indentation (2 or 4 spaces, no tabs).
- Declare constants at the top of the file.
- Define utility functions in a separate section or file if they are reused across multiple files.
- Use descriptive names for functions and variables.
- Keep functions short and focused on a single task.

## Example structure

```javascript
// File description or purpose
// -------------------------------
// Constants
const SOME_CONSTANT = value;
// -------------------------------
// Utility Functions
function utilityFunction() {
  // ...
}
// -------------------------------
// Main Code
document.addEventListener("DOMContentLoaded", () => {
  // Element and variable declarations
  const element = document.getElementById("elementId");

  // Initialization code
  initialize();
  function initialize() {
    // Initialization logic
  }

  // Event listeners
  element.addEventListener("click", () => {
    // Event handler code
  });
});
```

## Specific guidelines

- Avoid defining utility functions like `byId` or `isMobile` directly in multiple files. Instead, place them in a dedicated utility file (e.g., `utilities/dom-script.js` or `utilities/plattform-script.js`) and import them where needed.
- Ensure that all utility functions are well-documented and tested.
- Maintain a consistent naming convention (e.g., camelCase for variables and functions).
- Use ES6+ features (like `const`, `let`, arrow functions) for better readability and performance.
- Keep the code modular and reusable by separating concerns into different files when appropriate.
- Use jQuery, when it makes the code cleaner and more efficient, but avoid over-reliance on it for simple DOM manipulations that can be done with vanilla JavaScript.
- Only document sections of code that are not self-explanatory and avoid redundant comments.
- Only comment in English.
- Ensure that all scripts are properly linked in the HTML files where they are used.
