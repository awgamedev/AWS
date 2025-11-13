document.addEventListener("alpine:init", () => {
  Alpine.data("sidebarDropdown", () => ({
    open: false,
    isActive: false,
    activePrefix: "",

    init() {
      this.activePrefix = this.$el.dataset.activePrefix;
      const initialOpenString = this.$el.dataset.initialOpen;
      this.open = initialOpenString === "true";
      this.checkActiveState();
    },

    checkActiveState() {
      const currentPath = window.location.pathname.split("?")[0];
      this.isActive = currentPath.startsWith(this.activePrefix);
    },
  }));
});
