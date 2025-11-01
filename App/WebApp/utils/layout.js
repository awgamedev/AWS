// utils/layout.js

/**
 * Generates the full HTML structure for a page.
 * @param {string} title - The title for the HTML document.
 * @param {string} bodyContent - The HTML content to be placed inside the <body>.
 * @param {string} [styles=''] - Optional CSS styles specific to the page.
 * @returns {string} The complete HTML document string.
 */
const generateLayout = (title, bodyContent, styles = "") => {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <!-- Tailwind CSS laden -->
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/css/layout.css">

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

            <!-- Sidebar-Menü -->
            <nav class="p-4 space-y-1">
                <a href="#" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl text-indigo-400 bg-gray-800 hover:bg-gray-800 transition duration-150">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Dashboard</span>
                </a>
                <a href="#" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl text-gray-300 hover:bg-gray-800 transition duration-150">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2m0 2h-2M10 10.25V13.75M13.75 10.25V13.75M7.75 7.75V17.25M16.25 7.75V17.25"></path></svg>
                    <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Projekte</span>
                </a>
                <a href="#" class="sidebar-item group flex items-center space-x-3 p-3 rounded-xl text-gray-300 hover:bg-gray-800 transition duration-150">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span class="sidebar-item-text text-sm font-medium transition-opacity duration-300">Einstellungen</span>
                </a>
            </nav>
        </aside>

        <!-- 2. Hauptinhalt und Kopfzeile (Main Content Area) -->
        <div id="main-content" class="flex-grow flex flex-col">
            <!-- Kopfzeile (Header) -->
            <header class="bg-white shadow-sm flex-shrink-0 border-b border-gray-200">
                <div class="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <!-- Button zum Umschalten der Sidebar (wird auf Desktop angezeigt) -->
                    <button id="toggleSidebarDesktop" class="hidden md:block p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none">
                        <svg id="menuIcon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                        <svg id="closeIcon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <!-- Button zum Öffnen der Sidebar (wird auf Mobile angezeigt) -->
                    <button id="openSidebarMobile" class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>

                    <h2 class="text-xl font-semibold text-gray-800">Haupt-Dashboard</h2>

                    <!-- Profil-Menü/Aktionen -->
                    <div class="flex items-center space-x-4">
                        <span class="text-sm font-medium text-gray-600 hidden sm:block">Max Mustermann</span>
                        <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">MM</div>
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


        <script src="/js/layout.js"></script>
    </body>
    </html>

    `;
};

module.exports = generateLayout;
