// ============================================================================
// TASK TEMPLATE MANAGEMENT SCRIPT
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initModal === "function") initModal();
  initTemplateManagement();
});

// Expose form accessors globally so other handlers can use them
const getCreateForm = () => byId("create-template-form");
const getEditForm = () => byId("edit-template-form");

// Submit handlers need global scope (edit handler invoked outside init function)
function createSubmitHandler(e) {
  e.preventDefault();
  handleCreateTemplate(getCreateForm());
}

function editSubmitHandler(e) {
  e.preventDefault();
  handleUpdateTemplate(getEditForm());
}

function initTemplateManagement() {
  const btnCreateTemplate = byId("btn-create-template");

  // Create template button
  if (btnCreateTemplate) {
    btnCreateTemplate.addEventListener("click", () => {
      const tpl = byId("tpl-create-template-modal");
      if (!tpl) return;
      openModal(
        window.CREATE_TEMPLATE_MODAL_TITLE || "Create Template",
        tpl.innerHTML
      );
      setTimeout(() => {
        const form = getCreateForm();
        if (form) {
          form.reset();
          clearMessage(byId("template-form-message"));
          form.addEventListener("submit", createSubmitHandler, { once: true });
        }
      }, 50);
    });
  }

  // Edit and delete buttons
  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit-template");
    const deleteBtn = e.target.closest(".btn-delete-template");

    if (editBtn) {
      const templateId = editBtn.dataset.templateId;
      handleEditTemplate(templateId);
    }

    if (deleteBtn) {
      const templateId = deleteBtn.dataset.templateId;
      handleDeleteTemplate(templateId);
    }
  });
}

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

async function handleCreateTemplate(form) {
  const messageEl = byId("template-form-message");
  clearMessage(messageEl);

  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const response = await api("/api/task-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response && response.ok) {
      setMessage(
        messageEl,
        "success",
        response.data.msg || "Template created successfully!"
      );

      setTimeout(() => {
        closeModal("create-template-modal");
        window.location.reload();
      }, 1000);
    } else {
      setMessage(
        messageEl,
        "error",
        response?.data?.msg || "Error creating template"
      );
    }
  } catch (error) {
    console.error("Error creating template:", error);
    setMessage(
      messageEl,
      "error",
      "An error occurred while creating the template"
    );
  }
}

// ============================================================================
// EDIT TEMPLATE
// ============================================================================

async function handleEditTemplate(templateId) {
  try {
    const response = await api(`/api/task-templates/${templateId}`);

    if (response && response.ok && response.data.template) {
      const template = response.data.template;

      // Populate form
      const tpl = byId("tpl-edit-template-modal");
      if (!tpl) return;
      openModal(
        window.EDIT_TEMPLATE_MODAL_TITLE || "Edit Template",
        tpl.innerHTML
      );
      setTimeout(() => {
        byId("edit-template-id").value = template._id;
        byId("edit-templateName").value = template.templateName;
        byId("edit-taskName").value = template.taskName;
        byId("edit-taskPriority").value = template.taskPriority;
        byId("edit-defaultDuration").value = template.defaultDuration || "";
        byId("edit-taskDescription").value = template.taskDescription || "";
        clearMessage(byId("edit-template-form-message"));
        const form = getEditForm();
        if (form)
          form.addEventListener("submit", editSubmitHandler, { once: true });
      }, 50);
    } else {
      alert("Error loading template");
    }
  } catch (error) {
    console.error("Error loading template:", error);
    alert("An error occurred while loading the template");
  }
}

async function handleUpdateTemplate(form) {
  const messageEl = byId("edit-template-form-message");
  clearMessage(messageEl);

  try {
    const templateId = byId("edit-template-id").value;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const response = await api(`/api/task-templates/${templateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response && response.ok) {
      setMessage(
        messageEl,
        "success",
        response.data.msg || "Template updated successfully!"
      );

      setTimeout(() => {
        closeModal("edit-template-modal");
        window.location.reload();
      }, 1000);
    } else {
      setMessage(
        messageEl,
        "error",
        response?.data?.msg || "Error updating template"
      );
    }
  } catch (error) {
    console.error("Error updating template:", error);
    setMessage(
      messageEl,
      "error",
      "An error occurred while updating the template"
    );
  }
}

// ============================================================================
// DELETE TEMPLATE
// ============================================================================

async function handleDeleteTemplate(templateId) {
  if (!confirm("Are you sure you want to delete this template?")) {
    return;
  }

  try {
    const response = await api(`/api/task-templates/${templateId}`, {
      method: "DELETE",
    });

    if (response && response.ok) {
      window.location.reload();
    } else {
      alert("Error deleting template");
    }
  } catch (error) {
    console.error("Error deleting template:", error);
    alert("An error occurred while deleting the template");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function setMessage(el, type, text) {
  if (!el) return;
  const color =
    type === "success"
      ? "text-green-600 bg-green-50 border border-green-200"
      : type === "error"
      ? "text-red-600 bg-red-50 border border-red-200"
      : "text-yellow-600 bg-yellow-50 border border-yellow-200";

  el.textContent = text;
  el.className = `text-sm font-medium text-center px-3 py-2 rounded-md ${color}`;
}

function clearMessage(el) {
  if (!el) return;
  el.textContent = "";
  el.className = "hidden text-sm font-medium text-center px-3 py-2 rounded-md";
}
