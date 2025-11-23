// ============================================================================
// UTILITIES
// ============================================================================

const setMessage = (el, type, text) => {
  if (!el) return;
  const color =
    type === "success"
      ? "text-green-600"
      : type === "error"
      ? "text-red-600"
      : "text-yellow-600";

  el.textContent = text;
  el.className = `mb-4 text-sm font-medium text-center ${color} block`;
};

const clearMessage = (el) => {
  if (!el) return;
  el.textContent = "";
  el.className = "mb-4 text-sm font-medium text-center hidden";
};

// const reloadAfter = (delay = 1000) => {
//   setTimeout(() => window.location.reload(), delay);
// };

// ============================================================================
// FORM HANDLERS
// ============================================================================

const handleCreateStamping = async (form) => {
  const msg = byId("create-stamping-form-message");
  setMessage(msg, "info", "Stempelpaar wird gespeichert...");

  try {
    const formData = new FormData(form);

    const payload = {
      userId: formData.get("userId"),
      reason: formData.get("reason"),
      date: formData.get("date"),
      inTime: formData.get("inTime"),
      outTime: formData.get("outTime") || null,
    };

    const { ok, data } = await api("/api/stampings/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      setMessage(
        msg,
        "success",
        data.msg || "Stempelpaar erfolgreich gespeichert!"
      );
      reloadAfter();
    } else {
      setMessage(
        msg,
        "error",
        data.msg || "Fehler beim Speichern des Stempelpaars."
      );
    }
  } catch (err) {
    console.error("Create stamping pair error:", err);
    setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
  }
};

const handleDeleteStampingPair = async () => {
  const msg = byId("delete-stamping-message");
  const inId = byId("delete-inId")?.value;
  const outId = byId("delete-outId")?.value;

  if (!inId && !outId) {
    setMessage(msg, "error", "Fehler: Stempel-IDs nicht gefunden.");
    return;
  }

  setMessage(msg, "info", "Stempelung wird gelöscht...");

  try {
    // Delete both stampings
    const deletePromises = [];

    if (inId) {
      deletePromises.push(api(`/api/stampings/${inId}`, { method: "DELETE" }));
    }

    if (outId) {
      deletePromises.push(api(`/api/stampings/${outId}`, { method: "DELETE" }));
    }

    const results = await Promise.all(deletePromises);
    const allSuccessful = results.every((result) => result.ok);

    if (allSuccessful) {
      setMessage(msg, "success", "Stempelung erfolgreich gelöscht!");
      reloadAfter();
    } else {
      setMessage(msg, "error", "Fehler beim Löschen der Stempelung.");
    }
  } catch (err) {
    console.error("Delete stamping error:", err);
    setMessage(msg, "error", "Netzwerkfehler beim Löschversuch.");
  }
};

const handleEditStampingPair = async (form) => {
  const msg = byId("edit-stamping-pair-message");
  setMessage(msg, "info", "Änderungen werden gespeichert...");

  try {
    const formData = new FormData(form);

    const payload = {
      inId: formData.get("inId"),
      outId: formData.get("outId"),
      reason: formData.get("reason"),
      date: formData.get("date"),
      inTime: formData.get("inTime"),
      outTime: formData.get("outTime") || null,
    };

    const { ok, data } = await api("/api/stampings/pair", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      setMessage(
        msg,
        "success",
        data.msg || "Stempelpaar erfolgreich aktualisiert!"
      );
      reloadAfter();
    } else {
      setMessage(
        msg,
        "error",
        data.msg || "Fehler beim Aktualisieren des Stempelpaars."
      );
    }
  } catch (err) {
    console.error("Edit stamping pair error:", err);
    setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
  }
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize modal component
  initModal();

  // Open Create Stamping Modal
  document.querySelectorAll(".add-stamping-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const userId = e.currentTarget.dataset.userId;
      const username = e.currentTarget.dataset.username;

      openModalFromApi(
        `Stempelung hinzufügen für ${username}`,
        `/api/modal/stamping-create?userId=${userId}`
      );
    });
  });

  // Open Edit Stamping Pair Modal
  document.querySelectorAll(".edit-stamping-pair-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const inId = e.currentTarget.dataset.inId;
      const outId = e.currentTarget.dataset.outId;
      const date = e.currentTarget.dataset.date;
      const inTime = e.currentTarget.dataset.inTime;
      const outTime = e.currentTarget.dataset.outTime;
      const reason = e.currentTarget.dataset.reason;
      const unclosed = e.currentTarget.dataset.unclosed;

      // Convert time format from HH:MM to HH:MM for input
      const inTimeFormatted = inTime.replace(":", ":").substring(0, 5);
      const outTimeFormatted =
        outTime !== "FEHLT" ? outTime.replace(":", ":").substring(0, 5) : "";

      openModalFromApi(
        "Stempelpaar bearbeiten",
        `/api/modal/stamping-edit?inId=${inId}&outId=${
          outId || ""
        }&date=${date}&inTime=${encodeURIComponent(
          inTimeFormatted
        )}&outTime=${encodeURIComponent(
          outTimeFormatted
        )}&reason=${encodeURIComponent(reason)}&unclosed=${unclosed}`
      );
    });
  });

  // Open Delete Stamping Modal
  document.querySelectorAll(".delete-stamping-pair-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const inId = e.currentTarget.dataset.inId;
      const outId = e.currentTarget.dataset.outId;
      const pairDisplay = e.currentTarget.dataset.pairDisplay;

      openModalFromApi(
        "Stempelung löschen",
        `/api/modal/stamping-delete?inId=${inId}&outId=${outId}&pairDisplay=${encodeURIComponent(
          pairDisplay
        )}`
      );
    });
  });

  // Form submissions (delegated)
  document.addEventListener("submit", async (e) => {
    const form = e.target;

    if (form.id === "create-stamping-form") {
      e.preventDefault();
      await handleCreateStamping(form);
    } else if (form.id === "edit-stamping-pair-form") {
      e.preventDefault();
      await handleEditStampingPair(form);
    }
  });

  // Delete button (delegated)
  document.addEventListener("click", async (e) => {
    if (
      e.target.id === "confirm-delete-stamping-btn" ||
      e.target.closest("#confirm-delete-stamping-btn")
    ) {
      e.preventDefault();
      await handleDeleteStampingPair();
    }
  });
});
