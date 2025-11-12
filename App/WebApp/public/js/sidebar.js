// /public/js/sidebar.js

document.addEventListener("alpine:init", () => {
  Alpine.data("sidebarDropdown", () => ({
    open: false,
    isActive: false,
    activePrefix: "",

    init() {
      this.activePrefix = this.$el.dataset.activePrefix;
      this.checkActiveState();
    },

    checkActiveState() {
      const currentPath = window.location.pathname.split("?")[0];

      // Aktiv-Status bestimmen
      this.isActive = currentPath.startsWith(this.activePrefix);

      // Wenn der Pfad aktiv ist, MUSS das Dropdown geöffnet werden.
      if (this.isActive) {
        this.open = true;
      }
    },
  }));
});
