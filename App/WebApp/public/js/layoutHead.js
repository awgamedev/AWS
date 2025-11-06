document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("userMenuButton");
  const dropdown = document.getElementById("userMenuDropdown");

  if (button && dropdown) {
    // Funktion zum Umschalten des Dropdown-Menüs
    const toggleDropdown = () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";

      // Toggle 'hidden' class
      dropdown.classList.toggle("hidden");

      // Toggle ARIA attributes
      button.setAttribute("aria-expanded", (!isExpanded).toString());
    };

    // Event-Listener für den Button-Klick
    button.addEventListener("click", (event) => {
      event.stopPropagation(); // Verhindert, dass ein window-Click-Event sofort auslöst
      toggleDropdown();
    });

    // Schließen, wenn außerhalb geklickt wird
    window.addEventListener("click", (event) => {
      if (
        !dropdown.classList.contains("hidden") &&
        !button.contains(event.target)
      ) {
        dropdown.classList.add("hidden");
        button.setAttribute("aria-expanded", "false");
      }
    });

    // Schließen bei Escape-Taste
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dropdown.classList.contains("hidden")) {
        dropdown.classList.add("hidden");
        button.setAttribute("aria-expanded", "false");
      }
    });
  }
});
