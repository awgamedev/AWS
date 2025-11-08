/**
 * Generates the sidebar HTML for the application.
 * @param {string} currentPath - The current request path for active link highlighting.
 * @returns {string} The HTML string for the sidebar navigation.
 */
const generateMenuEntries = (currentPath) => {
  // Definiere die Klassen für den aktiven Zustand
  const ACTIVE_CLASSES = "text-indigo-400 bg-gray-800";
  const INACTIVE_CLASSES = "text-gray-300";

  // Hilfsfunktion, um die richtigen Klassen zu bestimmen
  const getClasses = (href) => {
    // Standardmäßig ist Dashboard aktiv, falls der Pfad '/' oder '#' ist,
    // oder wenn der aktuelle Pfad genau dem href entspricht.
    const isActive =
      currentPath === href || (href === "#" && currentPath === "/");

    // *WICHTIG*: Für das Dashboard, falls currentPath leer oder nur '/',
    // musst du eine passende Logik einfügen, z.B.:
    if (href === "#" && (currentPath === "/" || currentPath === "")) {
      return `${ACTIVE_CLASSES} hover:bg-gray-800`;
    }

    return isActive
      ? `${ACTIVE_CLASSES} hover:bg-gray-800`
      : `${INACTIVE_CLASSES} hover:bg-gray-800`;
  };

  return `
        <nav class="p-4 space-y-1">
            <a href="/" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/"
            )} transition duration-150">
                <span class="fas fa-home"></span>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Dashboard</span>
            </a>
            
            <a href="/stamping" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/stamping"
            )} transition duration-150">
                <span class="fa-solid fa-utensils"></span>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Stempelungen</span>
            </a>
            
            <a href="/user-list" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/user-list"
            )} transition duration-150">
                <span class="fas fa-user"></span>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Nutzer</span>
            </a>
            
            <a href="/settings" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/settings"
            )} transition duration-150">  
                <span class="fas fa-gear"></span>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Einstellungen</span>
            </a>
        </nav>
    `;
};

module.exports = generateMenuEntries;
