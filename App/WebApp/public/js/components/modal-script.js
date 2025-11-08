// --- Client-side JavaScript (e.g., in a script tag or main.js) ---

// Example function to show the modal
function createAndShowModal(title, content) {
  const newModal = new Modal(title, content);
  newModal.open();
  return newModal;
}

// Event listener for a button to trigger a new modal
document.getElementById("open-info-modal-btn").addEventListener("click", () => {
  const title = "User Information";
  const content =
    '<p>This is a dynamically generated modal using the reusable class and styled with Tailwind CSS.</p><form class="mt-4"><input type="text" placeholder="Enter data" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"></form>';

  createAndShowModal(title, content);
});

document
  .getElementById("open-confirm-modal-btn")
  .addEventListener("click", () => {
    const title = "Confirm Action";
    const content =
      '<p>Are you sure you want to proceed with this action?</p><div class="flex justify-end space-x-2 mt-4"><button class="px-4 py-2 bg-red-600 text-white rounded">Confirm</button></div>';

    createAndShowModal(title, content);
  });
