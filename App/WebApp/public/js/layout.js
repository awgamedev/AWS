// layout.js

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // Constants / Elements
  // -------------------------------
  const sidebar = byId("sidebar");
  const overlay = byId("sidebar-overlay");
  const toggleDesktopButton = byId("toggleSidebarDesktop");
  const openMobileButton = byId("openSidebarMobile");
  const closeMobileButton = byId("closeSidebarMobile");
  const menuIcon = byId("menuIcon");
  const closeIcon = byId("closeIcon");

  // State
  let isCollapsed = false; // desktop state

  // -------------------------------
  // Initialization
  // -------------------------------
  init();

  function initEventBindings() {
    toggleDesktopButton?.addEventListener("click", () => toggleSidebar());
    openMobileButton?.addEventListener("click", () => toggleSidebar(true));
    closeMobileButton?.addEventListener("click", () => toggleSidebar(false));
  }

  function init() {
    applyInitialState();
    initEventBindings();
    setupSidebarActiveState();
    window.addEventListener("resize", handleResize);
  }

  // -------------------------------
  // Sidebar toggling
  // -------------------------------
  function toggleSidebar(forceState = null) {
    if (!sidebar) return;

    if (isMobile()) {
      const isOpen = sidebar.classList.contains("sidebar-open");
      const newState = forceState !== null ? forceState : !isOpen;

      if (newState) {
        sidebar.classList.add("sidebar-open");
        overlay.classList.remove("hidden");
        requestAnimationFrame(() => overlay.classList.add("opacity-50"));
      } else {
        sidebar.classList.remove("sidebar-open");
        overlay.classList.remove("opacity-50");
        setTimeout(() => overlay.classList.add("hidden"), 300);
      }
    } else {
      // Desktop collapse logic
      const shouldBeExpanded = forceState !== null ? forceState : isCollapsed;
      isCollapsed = !shouldBeExpanded;

      if (isCollapsed) {
        sidebar.classList.add("collapsed");
        menuIcon.classList.add("hidden");
        closeIcon.classList.remove("hidden");
      } else {
        sidebar.classList.remove("collapsed");
        menuIcon.classList.remove("hidden");
        closeIcon.classList.add("hidden");
      }
    }
  }

  // -------------------------------
  // Active state for sidebar items
  // -------------------------------
  function setupSidebarActiveState() {
    const items = document.querySelectorAll(".sidebar-item");
    const activeClasses = ["text-indigo-400", "bg-gray-800"];
    const inactiveClasses = ["text-gray-300"];

    function clearActive() {
      items.forEach((el) => {
        el.classList.remove(...activeClasses);
        el.classList.add(...inactiveClasses);
      });
    }

    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        // Do not close the sidebar when clicking a dropdown toggle
        // Dropdown toggle buttons are marked with data-sidebar-role="dropdown-toggle"
        if (item.dataset && item.dataset.sidebarRole === "dropdown-toggle") {
          // Let Alpine handle expanding/collapsing; prevent unintended mobile close
          e.stopPropagation();
          // No active state update or sidebar toggle for dropdown toggles
          return;
        }

        if (item.getAttribute("href") === "#") e.preventDefault();
        clearActive();
        item.classList.add(...activeClasses);
        item.classList.remove(...inactiveClasses);
        if (isMobile()) toggleSidebar(false);
      });
    });
  }

  // -------------------------------
  // Responsive adjustments
  // -------------------------------
  function applyInitialState() {
    if (isMobile()) {
      sidebar.classList.remove("sidebar-open", "collapsed");
      menuIcon?.classList.remove("hidden");
      closeIcon?.classList.add("hidden");
      overlay.classList.add("hidden");
      overlay.classList.remove("opacity-50");
    } else {
      isCollapsed = false;
      sidebar.classList.remove("collapsed");
      menuIcon?.classList.remove("hidden");
      closeIcon?.classList.add("hidden");
    }
  }

  function handleResize() {
    if (!sidebar) return;
    if (!isMobile()) {
      // Leaving mobile -> desktop
      if (sidebar.classList.contains("sidebar-open")) {
        sidebar.classList.remove("sidebar-open");
        overlay.classList.add("hidden");
        overlay.classList.remove("opacity-50");
      }
      // Ensure desktop state reflects isCollapsed
      if (isCollapsed) {
        sidebar.classList.add("collapsed");
        menuIcon?.classList.add("hidden");
        closeIcon?.classList.remove("hidden");
      } else {
        sidebar.classList.remove("collapsed");
        menuIcon?.classList.remove("hidden");
        closeIcon?.classList.add("hidden");
      }
    } else {
      // Leaving desktop -> mobile
      sidebar.classList.remove("collapsed");
      menuIcon?.classList.remove("hidden");
      closeIcon?.classList.add("hidden");
    }
  }
});
