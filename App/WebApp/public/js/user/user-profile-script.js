// -------------------------------
// Constants
// -------------------------------
const MODAL_ID = "edit-profile-modal";
const FORM_ID = "edit-profile-form";
const ERRORS_ID = "form-errors";

// -------------------------------
// Main Code
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Element declarations
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("cancel-modal-btn");
  const modal = document.getElementById(MODAL_ID);
  const form = document.getElementById(FORM_ID);
  const errorsContainer = document.getElementById(ERRORS_ID);
  const uploadAvatarBtn = document.getElementById("upload-avatar-btn");
  const avatarInput = document.getElementById("avatar-input");
  const removeAvatarBtn = document.getElementById("remove-avatar-btn");

  // Initialize modal functionality
  initializeModal();

  // Initialize form submission
  initializeFormSubmit();

  // Initialize profile picture upload
  initializeProfilePictureUpload();

  // Initialize avatar toggle functionality
  initializeAvatarToggle();

  // -------------------------------
  // Modal Functions
  // -------------------------------
  function initializeModal() {
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", openModal);
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", closeModal);
    }

    if (cancelModalBtn) {
      cancelModalBtn.addEventListener("click", closeModal);
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
  }

  function openModal() {
    if (modal) {
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal() {
    if (modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
      clearErrors();
    }
  }

  // -------------------------------
  // Form Submission Functions
  // -------------------------------
  function initializeFormSubmit() {
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleFormSubmit();
      });
    }
  }

  async function handleFormSubmit() {
    clearErrors();

    const formData = new FormData(form);
    const data = {
      pauseInMinutesPerDay: formData.get("pauseInMinutesPerDay") || null,
    };

    try {
      const response = await fetch("profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(result.msg);
        closeModal();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        if (result.errors) {
          showErrors(result.errors);
        } else {
          showErrors({ general: result.msg });
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showErrors({ general: "An error occurred while updating the profile." });
    }
  }

  // -------------------------------
  // Avatar Toggle Functions
  // -------------------------------
  function initializeAvatarToggle() {
    const profileAvatar = document.getElementById("profile-avatar");
    const avatarActionButtons = document.querySelectorAll(".avatar-action-btn");

    if (profileAvatar && avatarActionButtons.length > 0) {
      profileAvatar.addEventListener("click", () => {
        avatarActionButtons.forEach((btn) => {
          btn.classList.toggle("hidden");
        });
      });
    }
  }

  // -------------------------------
  // Profile Picture Upload Functions
  // -------------------------------
  function initializeProfilePictureUpload() {
    if (uploadAvatarBtn) {
      uploadAvatarBtn.addEventListener("click", () => {
        avatarInput.click();
      });
    }

    if (avatarInput) {
      avatarInput.addEventListener("change", handleFileSelect);
    }

    if (removeAvatarBtn) {
      removeAvatarBtn.addEventListener("click", async () => {
        const confirmed = window.confirm(
          "Are you sure you want to remove your profile picture?"
        );
        if (!confirmed) return;
        await removeProfilePicture();
      });
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      await uploadProfilePicture(base64);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("An error occurred while uploading the profile picture.");
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadProfilePicture(base64) {
    try {
      const response = await fetch("profile/upload-picture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(result.msg);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(result.msg);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert("An error occurred while uploading the profile picture.");
    }
  }

  async function removeProfilePicture() {
    try {
      const response = await fetch("profile/remove-picture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(result.msg || "Profile picture removed.");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(result.msg || "Failed to remove profile picture.");
      }
    } catch (error) {
      console.error("Error removing profile picture:", error);
      alert("An error occurred while removing the profile picture.");
    }
  }

  // -------------------------------
  // Error and Success Handling
  // -------------------------------
  function showErrors(errors) {
    if (!errorsContainer) return;

    errorsContainer.classList.remove("hidden");

    let errorHtml = "<ul class='list-disc list-inside'>";
    for (const [field, message] of Object.entries(errors)) {
      errorHtml += `<li>${message}</li>`;
    }
    errorHtml += "</ul>";

    errorsContainer.innerHTML = errorHtml;
  }

  function clearErrors() {
    if (errorsContainer) {
      errorsContainer.classList.add("hidden");
      errorsContainer.innerHTML = "";
    }
  }

  function showSuccess(message) {
    const successDiv = document.createElement("div");
    successDiv.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }
});
