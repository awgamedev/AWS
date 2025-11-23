# Modal System Documentation

## Overview

This is a reusable modal component system that allows you to:

- Display modals dynamically without hardcoding them in views
- Fetch modal content via API endpoints
- Keep modal-related logic centralized in the `features/modal` directory
- Simplify client-side JavaScript

## Architecture

### Components

1. **Modal Routes** (`modal.routes.js`)

   - Handles API endpoints that return modal HTML content
   - Example: `/api/modal/task-create`, `/api/modal/task-edit`

2. **Modal Utility Script** (`public/js/utilities/modal-script.js`)

   - `initModal()` - Initializes the modal DOM element (call once on page load)
   - `openModal(title, content)` - Opens modal with static HTML content
   - `openModalFromApi(title, apiUrl, onContentLoaded)` - Fetches and displays modal content from an API
   - `closeModal()` - Closes the modal

3. **Modal View Template** (`features/modal/views/_modal.ejs`)

   - The actual modal HTML structure using Alpine.js
   - Uses custom events for open/close operations

4. **Modal Utils** (`modal-utils.js`)
   - Server-side helper to render EJS templates for modal content

## Usage

### Basic Setup

1. **Initialize the modal in your page script:**

```javascript
document.addEventListener("DOMContentLoaded", () => {
  // Initialize modal component (only needed once)
  initModal();

  // Your other initialization code...
});
```

2. **Open a modal with API-fetched content:**

```javascript
// Button click handler
document.getElementById("open-create-modal").addEventListener("click", () => {
  openModalFromApi(
    "Create New Task", // Modal title
    "api/modal/task-create", // API endpoint
    () => {
      // Callback after content loads
      setupDateValidation();
      // Any other initialization needed for the form
    }
  );
});
```

3. **Open a modal with static content:**

```javascript
openModal("Simple Modal", "<p>This is static content</p>");
```

### Creating a New Modal Endpoint

1. **Add a route in `modal.routes.js`:**

```javascript
router.get("/api/modal/my-feature", ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find({}).select("_id username").lean();
    const viewsPath = path.join(__dirname, "../my-feature/views");

    const html = renderModalContent(
      viewsPath,
      "my_feature_modal.ejs",
      users,
      req.__
    );

    res.json({ html });
  } catch (error) {
    req.logger.error("Error rendering my feature modal:", error);
    res.status(500).json({ error: "Failed to load modal content" });
  }
});
```

2. **Create the EJS template:**

Create `src/features/my-feature/views/my_feature_modal.ejs`:

```html
<form id="my-feature-form">
  <div class="mb-4">
    <label for="field1" class="block text-sm font-medium text-gray-700">
      <%= __("FIELD_LABEL") %>
    </label>
    <input
      type="text"
      id="field1"
      name="field1"
      class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
    />
  </div>

  <div
    id="form-message"
    class="mb-4 text-sm font-medium text-center hidden"
  ></div>

  <div class="flex justify-end">
    <button
      type="submit"
      class="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
    >
      <%= __("SAVE_BUTTON") %>
    </button>
  </div>
</form>
```

3. **Handle form submission in your feature script:**

```javascript
document.addEventListener("submit", async (e) => {
  if (e.target.id === "my-feature-form") {
    e.preventDefault();

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    const { ok, data } = await api("api/my-feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      // Success handling
      closeModal();
      reloadAfter();
    }
  }
});
```

## Benefits

### Before (Old System)

- Modal HTML was rendered server-side and embedded in every page
- Complex JavaScript with jQuery and vanilla JS mixed
- Difficult to reuse modals across different features
- Modal logic scattered across multiple files

### After (New System)

- Modal content fetched on-demand via API
- Clean, modular JavaScript
- Centralized modal management
- Easy to add new modals
- Better separation of concerns

## File Structure

```
src/
  features/
    modal/
      modal.routes.js           # API endpoints for modal content
      modal-utils.js            # Server-side rendering helpers
      views/
        _modal.ejs              # Modal HTML template
      README.md                 # This file
    task/
      task-script.js            # Simplified task scripts
      views/
        task_board.ejs          # No modal includes needed
        task_board_create_modal.ejs
        task_board_edit_modal.ejs
public/
  js/
    utilities/
      modal-script.js           # Client-side modal utilities
```

## Notes

- The modal uses Alpine.js for reactivity
- The modal is automatically injected into the DOM by `initModal()`
- Always call `initModal()` before attempting to open any modals
- Use the callback parameter in `openModalFromApi()` to initialize form elements after content loads
