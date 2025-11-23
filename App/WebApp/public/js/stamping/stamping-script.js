document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // Stamping button handlers
  // -------------------------------
  const stampButtons = document.querySelectorAll(
    "#stamp-in-btn, #stamp-out-btn"
  );
  const messageDiv = document.getElementById("stamping-message");
  const reasonSelect = document.getElementById("stamping-reason");
  const reasonError = document.getElementById("reason-error");

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
          messageDiv.classList.remove("hidden");
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
      messageDiv.classList.remove("hidden");
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

        messageDiv.classList.remove("hidden");

        if (response.ok) {
          messageDiv.textContent = data.msg || "Aktion erfolgreich.";
          messageDiv.classList.remove("text-yellow-600", "text-red-600");
          messageDiv.classList.add("text-green-600");
          setTimeout(() => window.location.reload(), 1000);
        } else {
          // Show specific validation errors if provided by server
          let errorMessage = data.msg || "Ein Fehler ist aufgetreten.";
          if (data.errors) {
            const errorTexts = Object.values(data.errors).filter(Boolean);
            if (errorTexts.length > 0) {
              errorMessage = errorTexts.join(" ");
            }
          }
          messageDiv.textContent = errorMessage;
          messageDiv.classList.remove("text-yellow-600", "text-green-600");
          messageDiv.classList.add("text-red-600");
        }
      } catch (error) {
        messageDiv.classList.remove("hidden");
        messageDiv.textContent = "Ein Netzwerkfehler ist aufgetreten.";
        messageDiv.classList.remove("text-yellow-600", "text-green-600");
        messageDiv.classList.add("text-red-600");
        console.error("Fetch Fehler:", error);
      }
    });
  });
});
