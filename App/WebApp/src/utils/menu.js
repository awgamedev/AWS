/**
 * Generates the sidebar HTML for the application.
 * @param {string} currentPath - The current request path for active link highlighting.
 * @returns {string} The HTML string for the sidebar navigation.
 */
const generateSidebar = (currentPath) => {
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
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Dashboard</span>
            </a>
            
            <a href="/projects" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/projects"
            )} transition duration-150">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2m0 2h-2M10 10.25V13.75M13.75 10.25V13.75M7.75 7.75V17.25M16.25 7.75V17.25"></path>
                </svg>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Projekte</span>
            </a>
            
            <a href="/user-list" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/user-list"
            )} transition duration-150">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Nutzer</span>
            </a>
            
            <a href="/settings" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl ${getClasses(
              "/settings"
            )} transition duration-150">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Einstellungen</span>
            </a>
        </nav>
    `;
};

module.exports = generateSidebar;
