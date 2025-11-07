generateMenuEntries = require("./menu"); // Import the sidebar generator

const getCSSImports = () => {
  return `
        <link rel="stylesheet" href="/lib/font-awesome/css/all.min.css">
        <link rel="stylesheet" href="/css/layout.css">
    `;
};

/**
 * Generates the necessary JavaScript imports for the layout.
 * @returns all script tags as a string.
 */
const getJavascriptImports = () => {
  return `
        <script src="/lib/jquery/jquery.min.js"></script>
        <script src="/lib/font-awesome/js/all.min.css"></script>
        <script src="/js/layout.js"></script>
        <script src="/js/layoutHead.js"></script>
    `;
};

// Helper function to safely get initials for the avatar
const getInitials = (name) => {
  if (!name) return "??";
  // Use the first letter of the first and last name/word
  const parts = name.split(/\s+/).filter(Boolean); // Split by any whitespace and filter empty strings

  if (parts.length === 0) return "G"; // Fallback for empty name
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generates the full HTML structure for a page.
 * @param {string} title - The title for the HTML document.
 * @param {string} bodyContent - The HTML content to be placed inside the <body>.
 * @param {string} currentPath - The current request path for active link highlighting.
 * @param {Object|null} user - The authenticated user object (muss .name oder .email enthalten).
 * @param {string} [styles=''] - Optional CSS styles specific to the page.
 * @returns {string} The complete HTML document string.
 */
const generateLayout = (
  title,
  bodyContent,
  currentPath,
  user = null,
  styles = ""
) => {
  const isLoggedIn = !!user;

  // 1. Prepare User Display Data
  // Stellt sicher, dass ein Name verwendet wird, oder fällt auf "Gast" zurück
  const userName = isLoggedIn
    ? user.username || user.email || "Benutzer"
    : "Gast";
  const userInitials = isLoggedIn ? getInitials(userName) : "G";

  // 2. Build the conditional dropdown menu content
  let userMenuContent;

  if (isLoggedIn) {
    userMenuContent = `
            <div class="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                Angemeldet als <strong>${userName}</strong>
            </div>
            <a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150" role="menuitem">
                Mein Profil
            </a>
            <form action="/logout" method="POST" role="none">
                <button type="submit" class="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition duration-150" role="menuitem">
                    🚪 Abmelden
                </button>
            </form>
        `;
  } else {
    userMenuContent = `
            <a href="/login" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition duration-150" role="menuitem">
                Anmelden
            </a>
            <a href="/register" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border-t border-gray-100 transition duration-150" role="menuitem">
                Registrieren
            </a>
        `;
  }

  // 3. Generate the full HTML structure, inserting the dynamic header content
  return `
        <!DOCTYPE html>
        <html lang="de">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                ${getCSSImports()}
                <style>
                    ${styles}
                </style>
            </head>
            <body class="bg-gray-50 flex flex-col min-h-screen">
                <!-- 1. Seitenleiste (Sidebar) -->
                <aside id="sidebar" class="sidebar-width bg-gray-900 text-white flex-shrink-0 z-40 transition-all duration-300 shadow-xl border-r border-gray-800">
                    <!-- Sidebar-Kopfzeile/Logo -->
                    <div class="p-6 flex items-center justify-between border-b border-gray-800">
                        <div class="flex items-center space-x-3">
                            <svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9.25 20.25L13.25 20.25L13.75 17M12 4V1M12 23V20M20 12H23M1 12H4M16.95 7.05L19.07 4.93M4.93 19.07L7.05 16.95M16.95 16.95L19.07 19.07M4.93 4.93L7.05 7.05"></path></svg>
                            <h1 class="logo-text text-xl font-bold tracking-tight transition-opacity duration-300">App-Dashboard</h1>
                        </div>
                        <!-- Toggle-Button für Mobile (wird nur auf kleinen Bildschirmen angezeigt) -->
                        <button id="closeSidebarMobile" class="md:hidden p-1 rounded-full text-gray-400 hover:bg-gray-800 focus:outline-none">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <a href="/changelang/de">Deutsch</a>
                    <a href="/changelang/en">English</a>
                    <a href="/changelang/fr">Français</a>

                    ${generateMenuEntries(currentPath)}
                </aside>

                <!-- 2. Hauptinhalt und Kopfzeile (Main Content Area) -->
                <div id="main-content" class="flex-grow flex flex-col">
                    <!-- Kopfzeile (Header) -->
                    <header class="bg-white shadow-md flex-shrink-0 border-b border-gray-200 sticky top-0 z-10">
                        <div class="px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                            
                            <!-- Linke Seite / Sidebar Toggles -->
                            <div class="flex items-center space-x-3">
                                <!-- Button zum Umschalten der Sidebar (Desktop) -->
                                <button id="toggleSidebarDesktop" class="hidden md:block p-2 rounded-lg text-gray-500 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150">
                                    <svg id="menuIcon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                                    <svg id="closeIcon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>

                                <!-- Button zum Öffnen der Sidebar (Mobile) -->
                                <button id="openSidebarMobile" class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                                </button>
                                
                                <h2 class="text-xl font-extrabold text-gray-800">Applikations-Dashboard 🚀</h2>
                            </div>

                            <!-- Profil-Menü / Dropdown -->
                            <div class="relative z-30">
                                <button id="userMenuButton" class="flex items-center space-x-3 focus:outline-none rounded-full py-1 px-2 hover:bg-gray-100 transition duration-150" aria-expanded="false" aria-haspopup="true">
                                    <!-- Anzeige des Nutzernamens -->
                                    <span class="text-sm font-medium text-gray-800 hidden sm:block">
                                        ${userName}
                                    </span>
                                    <!-- Avatar/Initialen -->
                                    <div class="w-10 h-10 rounded-full ${
                                      isLoggedIn
                                        ? "bg-indigo-600"
                                        : "bg-gray-400"
                                    } flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-indigo-300">
                                        ${userInitials}
                                    </div>
                                    <!-- Pfeil-Icon für Dropdown -->
                                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>

                                <!-- Dropdown-Menü (Standardmäßig versteckt) -->
                                <div id="userMenuDropdown" class="hidden absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                                    <div class="py-1" role="none">
                                        ${userMenuContent} 
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <!-- Hauptinhalt (Content) -->
                    <main class="flex-grow p-4 sm:p-6 lg:p-8">
                        ${bodyContent}
                    </main>

                    <!-- 3. Fußzeile (Footer) -->
                    <footer class="bg-white border-t border-gray-200 flex-shrink-0">
                        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                            <p class="text-center text-sm text-gray-500">
                                &copy; 2024 Modernes App-Layout. Alle Rechte vorbehalten. | Erstellt mit ❤️ und Tailwind CSS.
                            </p>
                        </div>
                    </footer>
                </div>

                <!-- Overlay für Mobile, um die Seitenleiste zu schließen -->
                <div id="sidebar-overlay" class="fixed inset-0 bg-black opacity-0 z-40 hidden transition-opacity duration-300 md:hidden" onclick="toggleSidebar(false)"></div>

                ${getJavascriptImports()}
            </body>
        </html>`;
};

module.exports = generateLayout;
