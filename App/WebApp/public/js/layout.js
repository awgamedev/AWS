const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("main-content");
const overlay = document.getElementById("sidebar-overlay");
const toggleDesktopButton = document.getElementById("toggleSidebarDesktop");
const openMobileButton = document.getElementById("openSidebarMobile");
const closeMobileButton = document.getElementById("closeSidebarMobile");
const menuIcon = document.getElementById("menuIcon");
const closeIcon = document.getElementById("closeIcon");

// Zustand der Seitenleiste
let isCollapsed = false;

/**
 * Schaltet die Seitenleiste ein/aus. Funktioniert auf allen Bildschirmgrößen.
 * @param {boolean} [forceState] - Erzwingt einen bestimmten Zustand (true=offen/nicht kollabiert, false=geschlossen/kollabiert).
 */
function toggleSidebar(forceState = null) {
  const isMobile = window.innerWidth < 768;

  // 1. Logik für Mobile (Sidebar fixiert, öffnet sich über das Overlay)
  if (isMobile) {
    const isCurrentlyOpen = sidebar.classList.contains("sidebar-open");
    const newState = forceState !== null ? forceState : !isCurrentlyOpen;

    if (newState) {
      sidebar.classList.add("sidebar-open");
      overlay.classList.remove("hidden");
      setTimeout(() => overlay.classList.add("opacity-50"), 10);
    } else {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("opacity-50");
      setTimeout(() => overlay.classList.add("hidden"), 300);
    }
  }
  // 2. Logik für Desktop (Sidebar kollabiert und verschiebt den Inhalt)
  else {
    isCollapsed = forceState !== null ? !forceState : !isCollapsed;

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

// Event-Listener für Desktop-Umschalter
toggleDesktopButton.addEventListener("click", () => toggleSidebar());

// Event-Listener für Mobile-Öffnen
openMobileButton.addEventListener("click", () => toggleSidebar(true));

// Event-Listener für Mobile-Schließen (innerhalb der Sidebar)
closeMobileButton.addEventListener("click", () => toggleSidebar(false));

// Event-Listener für Resize, um den Zustand anzupassen
window.addEventListener("resize", () => {
  const isMobile = window.innerWidth < 768;

  // Stellt sicher, dass auf dem Desktop die kollabierte/geöffnete Klasse angewendet wird
  if (!isMobile) {
    // Wenn es von Mobile zu Desktop wechselt und die Sidebar offen war, stelle den Desktop-Standard wieder her
    if (sidebar.classList.contains("sidebar-open")) {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.add("hidden");
      overlay.classList.remove("opacity-50");
    }
    // Initialisiere den Desktop-Zustand, falls er nicht gesetzt ist
    if (!isCollapsed && !sidebar.classList.contains("collapsed")) {
      // Initialer Zustand: Desktop ist geöffnet
      toggleSidebar(true);
    } else if (isCollapsed && !sidebar.classList.contains("collapsed")) {
      // Oder falls initial kollabiert
      toggleSidebar(false);
    }
  } else {
    // Auf Mobile: entferne Desktop-Klassen
    sidebar.classList.remove("collapsed");
    menuIcon.classList.remove("hidden");
    closeIcon.classList.add("hidden");
  }
});

// Initialisierung beim Laden, um den Desktop-Zustand korrekt zu setzen
window.addEventListener("load", () => {
  if (window.innerWidth >= 768) {
    // Standardmäßig auf Desktop geöffnet
    isCollapsed = false;
    sidebar.classList.remove("collapsed");
  } else {
    // Standardmäßig auf Mobile geschlossen
    sidebar.classList.remove("sidebar-open");
  }
});

// Füge diesen Code zu deinem bestehenden Sidebar-Steuerungsskript hinzu

/**
 * Steuert die Auswahl (aktiven Zustand) der Sidebar-Elemente.
 */
function setupSidebarActiveState() {
  // 1. Alle Sidebar-Elemente auswählen
  const sidebarItems = document.querySelectorAll(".sidebar-item");

  // Definiere die Klassen, die den aktiven Zustand ausmachen
  const activeClasses = ["text-indigo-400", "bg-gray-800"];
  const inactiveClasses = ["text-gray-300"];

  // Funktion zum Entfernen des aktiven Zustands von allen Elementen
  function removeActiveState() {
    sidebarItems.forEach((item) => {
      item.classList.remove(...activeClasses);
      item.classList.add(...inactiveClasses);
    });
  }

  // 2. Event Listener zu jedem Element hinzufügen
  sidebarItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      // Optional: Verhindere das sofortige Navigieren für reine 'href="#"' Links
      // if (item.getAttribute('href') === '#') {
      //     event.preventDefault();
      // }

      // Zustand von allen entfernen
      removeActiveState();

      // Aktiven Zustand zum geklickten Element hinzufügen
      item.classList.add(...activeClasses);
      item.classList.remove(...inactiveClasses);

      // Auf mobilen Geräten: Sidebar nach Klick schließen
      if (window.innerWidth < 768) {
        // Prüfen, ob eine Funktion 'toggleSidebar' existiert
        if (typeof toggleSidebar === "function") {
          toggleSidebar(false);
        }
      }
    });
  });
}

// 3. Aufruf der Funktion, nachdem das DOM geladen wurde und die Sidebar existiert
window.addEventListener("load", () => {
  // ... dein bestehender 'load' Listener-Code ...
  if (window.innerWidth >= 768) {
    // Standardmäßig auf Desktop geöffnet
    isCollapsed = false;
    sidebar.classList.remove("collapsed");
  } else {
    // Standardmäßig auf Mobile geschlossen
    sidebar.classList.remove("sidebar-open");
  }

  // Füge HIER den Aufruf der neuen Funktion hinzu:
  setupSidebarActiveState();
});
