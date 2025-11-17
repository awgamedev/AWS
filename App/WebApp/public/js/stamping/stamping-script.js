document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // Utilities
  // -------------------------------
  const MODAL_RENDER_DELAY_MS = 100;

  const setMessage = (el, type, text) => {
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

  const reloadAfter = (delay = 1500) => {
    setTimeout(() => window.location.reload(), delay);
  };

  // -------------------------------
  // Stamping button handlers
  // -------------------------------
  const stampButtons = document.querySelectorAll(
    "#stamp-in-btn, #stamp-out-btn"
  );
  const messageDiv = document.getElementById("stamping-message");
  const reasonSelect = document.getElementById("stamping-reason");
  const reasonError = document.getElementById("reason-error");
  const reasonSelectionDiv = document.getElementById("reason-selection");

  if ("<%= currentStatus %>" === "out") {
    reasonSelectionDiv.classList.remove("hidden");
  } else {
    reasonSelectionDiv.classList.add("hidden");
  }

  stampButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      const stampingType = event.currentTarget.getAttribute("data-type");

      if (event.currentTarget.disabled) return;

      // Validierung des Grundes beim Einstempeln
      let stampingReason = null;
      if (stampingType === "in") {
        stampingReason = reasonSelect.value;
        if (!stampingReason) {
          reasonError.classList.remove("hidden");
          messageDiv.textContent =
            "Bitte wähle einen Grund für das Einstempeln aus."; // Hardcoded, da i18n nicht in JS übertragen wird
          messageDiv.classList.remove(
            "text-green-600",
            "text-red-600",
            "text-yellow-600"
          );
          messageDiv.classList.add("text-red-600");
          return;
        }
        reasonError.classList.add("hidden");
      }

      // Ladezustand anzeigen
      messageDiv.textContent = "Verarbeite Stempelvorgang...";
      messageDiv.classList.remove(
        "text-green-600",
        "text-red-600",
        "text-gray-600"
      );
      messageDiv.classList.add("text-yellow-600");

      try {
        const response = await fetch("/stamp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stampingType, stampingReason }),
        });

        const data = await response.json();

        messageDiv.textContent = data.msg || "Aktion erfolgreich.";

        if (response.ok) {
          messageDiv.classList.remove("text-yellow-600", "text-red-600");
          messageDiv.classList.add("text-green-600");
          setTimeout(() => window.location.reload(), 1000);
        } else {
          messageDiv.classList.remove("text-yellow-600", "text-green-600");
          messageDiv.classList.add("text-red-600");
        }
      } catch (error) {
        messageDiv.textContent = "Ein Netzwerkfehler ist aufgetreten.";
        messageDiv.classList.remove("text-yellow-600", "text-green-600");
        messageDiv.classList.add("text-red-600");
        console.error("Fetch Fehler:", error);
      }
    });
  });

  // -------------------------------
  // Stamping list items -> open edit modal
  // -------------------------------
  const fillEditFormFromDataset = (data) => {
    byId("edit-stampingId").value = data.comeId;
    byId("edit-stampingType").value = "in";
    byId("edit-reason").value = data.reason;
    byId("edit-arriveDate").value = data.comeDate;
    byId("edit-leaveDate").value = data.goDate || "";

    clearMessage(byId("edit-stamping-form-message"));
  };

  document.querySelectorAll(".stamping-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const data = e.currentTarget.dataset;

      openModal(window.EDIT_STAMPING_TITLE, window.EDIT_STAMPING_HTML);

      setTimeout(() => fillEditFormFromDataset(data), MODAL_RENDER_DELAY_MS);
    });
  });

  // -------------------------------
  // Form submits (delegated)
  // -------------------------------
  document.addEventListener("submit", async (e) => {
    const { target } = e;

    // Edit Stamping
    if (target.id === "edit-stamping-form") {
      e.preventDefault();

      const msg = byId("edit-stamping-form-message");
      const stampingId = byId("edit-stampingId")?.value;

      if (!stampingId) {
        setMessage(msg, "error", "Stempelungs-ID nicht gefunden.");
        return;
      }

      setMessage(msg, "info", "Änderungen werden gespeichert...");

      try {
        const formData = new FormData(target);
        const payload = {
          stampingReason: formData.get("stampingReason"),
          arriveDate: formData.get("arriveDate"),
          leaveDate: formData.get("leaveDate") || null,
        };

        const { ok, data } = await api(`/api/stampings/${stampingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (ok) {
          setMessage(
            msg,
            "success",
            data.msg || "Stempelung erfolgreich aktualisiert!"
          );
          reloadAfter();
        } else {
          setMessage(
            msg,
            "error",
            data.msg || "Fehler beim Aktualisieren der Stempelung."
          );
        }
      } catch (err) {
        console.error("Fetch Update Fehler:", err);
        setMessage(msg, "error", "Netzwerkfehler beim Speichern.");
      }
    }
  });

  // -------------------------------
  // Delete stamping (delegated)
  // -------------------------------
  document.addEventListener("click", async (e) => {
    if (e.target.id !== "delete-stamping-btn") return;

    const msg = byId("edit-stamping-form-message");
    const stampingId = byId("edit-stampingId")?.value;

    if (
      !stampingId ||
      !confirm("Sind Sie sicher, dass Sie diese Stempelung löschen möchten?")
    ) {
      return;
    }

    setMessage(msg, "error", "Stempelung wird gelöscht...");

    try {
      const { ok, data } = await api(`/api/stampings/${stampingId}`, {
        method: "DELETE",
      });

      if (ok) {
        setMessage(
          msg,
          "success",
          data.msg || "Stempelung erfolgreich gelöscht!"
        );
        reloadAfter();
      } else {
        setMessage(
          msg,
          "error",
          data.msg || "Fehler beim Löschen der Stempelung."
        );
      }
    } catch (err) {
      console.error("Fetch Delete Fehler:", err);
      setMessage(msg, "error", "Netzwerkfehler beim Löschversuch.");
    }
  });
});
