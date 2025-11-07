generateMenuEntries = require("./menu"); // Import the sidebar generator
const path = require("path");

/**
 * Generates the necessary CSS import tags.
 * @returns {string} All CSS link tags as a string.
 */
const getCSSImports = () => {
  // Beachten Sie, dass Tailwind CSS über das Script-Tag in der EJS-Datei selbst geladen wird.
  return `
        <link rel="stylesheet" href="/lib/font-awesome/css/all.min.css">
        <link rel="stylesheet" href="/css/layout.css">
    `;
};

/**
 * Generates the necessary JavaScript imports for the layout.
 * @returns {string} All script tags as a string.
 */
const getJavascriptImports = () => {
  return `
        <script src="/lib/jquery/jquery.min.js"></script>
        <!-- Korrigiert: font-awesome JS statt CSS -->
        <script src="/lib/font-awesome/js/all.min.js"></script>
        <script src="/js/layout.js"></script>
        <script src="/js/layoutHead.js"></script>
    `;
};

/**
 * Helper function to safely get initials for the avatar.
 * @param {string} name - The user's name or email.
 * @returns {string} The capitalized initials.
 */
const getInitials = (name) => {
  if (!name) return "??";
  // Split by any whitespace and filter empty strings
  const parts = name.split(/\s+/).filter(Boolean);

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
  // 1. Die Logik zur Vorbereitung der Benutzer-Anzeigedaten wird hierher verschoben.
  const isLoggedIn = !!user;
  const userName = isLoggedIn
    ? user.username || user.email || "Benutzer"
    : "Gast";
  const userInitials = isLoggedIn ? getInitials(userName) : "G";

  // 2. Definiere die Daten (Locals), die an das EJS-Template übergeben werden
  const ejsData = {
    title,
    bodyContent,
    currentPath,
    user,
    styles,
    // NEU: Abgeleitete Werte werden direkt übergeben
    isLoggedIn,
    userName,
    userInitials,
    // Übergabe der Helper-Funktionen, auf die im EJS-Template zugegriffen wird
    getCSSImports,
    getJavascriptImports,
    getInitials,
    generateMenuEntries,
  };

  // 3. Rendere das EJS-Template
  // Wir verwenden path.join(process.cwd(), 'views/layout.ejs'), um den korrekten Pfad
  // relativ zum Projektstamm (root) zu gewährleisten.
  const templatePath = path.join(process.cwd(), "views/layout.ejs");

  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, ejsData, (err, html) => {
      if (err) {
        console.error("EJS Rendering Fehler beim Laden des Layouts:", err);
        return reject(err);
      }
      resolve(html);
    });
  });
};

module.exports = generateLayout;
