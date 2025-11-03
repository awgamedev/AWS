const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateLayout = require("../utils/layout");

const passport = require("passport");
const { ensureAuthenticated, checkRole } = require("../middleware/auth");

// --- Route: Benutzerlisten-Ansicht (GET /user-list) ---
router.get("/user-list", ensureAuthenticated, async (req, res) => {
  let users;
  try {
    users = await User.find({});
  } catch (err) {
    console.error("Fehler beim Abrufen der Benutzerliste:", err);
    return res
      .status(500)
      .send(
        generateLayout("Fehler", "Fehler beim Laden der Nutzerliste.", req.path)
      );
  }

  const content = `
    <link rel="stylesheet" href="/css/table.css">

    <div class="p-4 sm:p-6 lg:p-8">
      <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Nutzer-Liste 🧑‍💻</h2>
      
      <div class="mb-6 flex justify-end">
        <a href="/create-user" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          ➕ Neuen Nutzer erstellen
        </a>
      </div>

      <div class="mb-4">
        <input 
          type="text" 
          id="userSearch" 
          placeholder="Nach Benutzer, E-Mail oder Rolle suchen..." 
          class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
      </div>
            
      <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg relative max-h-96 overflow-y-auto">
        <table id="userTable" class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable sticky-col border-r border-gray-200" data-column="username">
                Nutzername <span></span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable border-r border-gray-200" data-column="email">
                E-Mail <span></span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable border-r border-gray-200" data-column="role">
                Rolle <span></span>
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody id="userTableBody" class="bg-white divide-y divide-gray-200">
            ${users
              .map(
                (user) => `
                <tr data-username="${user.username}" data-email="${user.email}" data-role="${user.role}">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky-col border-r border-gray-200">${user.username}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">${user.email}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">${user.role}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/edit-user/${user._id}" class="text-indigo-600 hover:text-indigo-900 mr-4">
                      Bearbeiten ✏️
                    </a>
                    <button 
                      onclick="document.getElementById('delete-form-${user._id}').submit()"
                      class="text-red-600 hover:text-red-900"
                    >
                      Löschen 🗑️
                    </button>
                    <form id="delete-form-${user._id}" action="/delete-user/${user._id}" method="POST" class="hidden">
                      <input type="hidden" name="_method" value="DELETE">
                    </form>
                  </td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <script src="/js/table.js"></script>
    `;

  res.send(generateLayout("Nutzer-Liste", content, req.path));
});

module.exports = router;
