// Sidebar dropdown component
// -------------------------------
// Constants
const DATA_ACTIVE_PREFIX = "activePrefix";
const DATA_INITIAL_OPEN = "initialOpen";
// -------------------------------
// Utility Functions
// (Move to utilities/navigation-script.js if reused)
function getCurrentPath() {
  return window.location.pathname.split("?")[0];
}
// -------------------------------
// Alpine Component Registration
document.addEventListener("alpine:init", () => {
  Alpine.data("sidebarDropdown", () => ({
    open: false,
    isActive: false,
    activePrefix: "",

    init() {
      this.activePrefix = this.$el.dataset[DATA_ACTIVE_PREFIX] || "";
      const initialOpen = this.$el.dataset[DATA_INITIAL_OPEN] === "true";
      this.open = initialOpen;
      this.updateActiveState();
    },

    updateActiveState() {
      const path = getCurrentPath();
      this.isActive = !!this.activePrefix && path.startsWith(this.activePrefix);
    },
  }));
});
