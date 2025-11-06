// src/utils/crudView.js

/**
 * Generiert das HTML für die Haupt-Listenansicht.
 * @param {object} config - Konfigurationsobjekt (entityNamePlural, createButton, listPath, modifyPath, tableHeaders)
 * @param {Array<object>} items - Die Liste der Entitäten (z.B. Nutzer)
 * @returns {string} Das vollständige HTML für die Liste.
 */
function renderList({ config, items }) {
  const { entityNamePlural, createButton, listPath, modifyPath, tableHeaders } =
    config;

  const tableHeaderHtml = tableHeaders
    .map(
      (header) => `
        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${
          header.key === tableHeaders[0].key
            ? "sticky-col border-r border-gray-200"
            : "border-r border-gray-200"
        }" data-column="${header.key}">
            ${header.label} ${header.sortable ? "<span></span>" : ""}
        </th>
    `
    )
    .join("");

  const tableBodyHtml = items
    .map((item) => {
      // Erzeugt die Datenattribute und Zellen basierend auf den Headern
      const dataAttributes = tableHeaders
        .map((header) => `data-${header.key}="${item[header.key] || ""}"`)
        .join(" ");

      const dataCells = tableHeaders
        .map(
          (header, index) => `
            <td class="px-6 py-4 whitespace-nowrap text-sm ${
              index === 0
                ? "font-medium text-gray-900 sticky-col"
                : "text-gray-500"
            } border-r border-gray-200">
                ${item[header.key] || ""}
            </td>
        `
        )
        .join("");

      return `
            <tr ${dataAttributes}>
                ${dataCells}
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="${modifyPath}/${item._id}" class="text-indigo-600 hover:text-indigo-900 mr-4">
                        Bearbeiten ✏️
                    </a>
                    <a href="${listPath}/confirm-delete/${item._id}" class="text-red-600 hover:text-red-900">
                        Löschen 🗑️
                    </a>
                </td>
            </tr>
        `;
    })
    .join("");

  return `
        <link rel="stylesheet" href="/css/table.css">

        <div class="p-4 sm:p-6 lg:p-8">
            <h2 class="text-3xl font-extrabold text-gray-900 mb-6">${entityNamePlural} 🚀</h2>
            
            <div class="mb-6 flex justify-end">
                <a href="${modifyPath}" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    ${createButton}
                </a>
            </div>

            <div class="mb-4">
                <input 
                    type="text" 
                    id="entitySearch" 
                    placeholder="Suchen nach ${tableHeaders
                      .map((h) => h.label)
                      .join(", ")}..." 
                    class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
            </div>
                
            <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg relative max-h-96 overflow-y-auto">
                <table id="entityTable" class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            ${tableHeaderHtml}
                            <th scope="col" class="relative px-6 py-3">
                                <span class="sr-only">Aktionen</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="entityTableBody" class="bg-white divide-y divide-gray-200">
                        ${tableBodyHtml}
                    </tbody>
                </table>
            </div>
        </div>

        <script src="/js/table.js"></script>
    `;
}

/**
 * Generiert das HTML für das Erstellen/Bearbeiten Formular.
 * @param {object} config - Konfigurationsobjekt (entityName, entityNamePlural, modifyPath, listPath, formFields)
 * @param {object} entityToModify - Das zu bearbeitende Objekt (leer für Erstellen)
 * @param {boolean} isEditing - Gibt an, ob der Bearbeitungsmodus aktiv ist
 * @returns {string} Das vollständige HTML für das Formular.
 */
function renderModifyForm({ config, entityToModify = {}, isEditing }) {
  const { entityName, modifyPath, listPath, formFields } = config;

  const title = isEditing
    ? `${entityName} bearbeiten ✍️`
    : `Neuen ${entityName} erstellen 📝`;
  const submitText = isEditing
    ? "💾 Änderungen speichern"
    : `💾 ${entityName} speichern`;

  const fieldHtml = formFields
    .map((field) => {
      let inputField = "";
      const currentValue =
        entityToModify[field.key] || field.defaultValue || "";

      switch (field.type) {
        case "select":
          const optionsHtml = field.options
            .map((option) => {
              const selected = currentValue === option.value ? "selected" : "";
              return `<option value="${option.value}" ${selected}>${option.label}</option>`;
            })
            .join("");
          inputField = `
                    <select id="${field.key}" name="${field.key}" 
                            class="mt-1 block w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
                        ${optionsHtml}
                    </select>
                `;
          break;
        case "password":
          inputField = `
                    <input type="password" id="${field.key}" name="${
            field.key
          }" 
                            ${field.required && !isEditing ? "required" : ""}
                            class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                            placeholder="${field.placeholder || ""}">
                `;
          break;
        case "text":
        case "email":
        default:
          inputField = `
                    <input type="${field.type}" id="${field.key}" name="${
            field.key
          }" 
                            ${field.required ? "required" : ""}
                            value="${
                              field.key === "password" ? "" : currentValue
                            }"
                            class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                            placeholder="${field.placeholder || ""}">
                `;
          break;
      }

      return `
            <div>
                <label for="${field.key}" class="block text-sm font-medium text-gray-700">${field.label}</label>
                ${inputField}
            </div>
        `;
    })
    .join("");

  return `
        <div class="max-w-md mx-auto mt-10 p-6 bg-white shadow-xl rounded-lg border border-gray-100">
            <h2 class="text-3xl font-extrabold mb-8 text-gray-900 text-center">${title}</h2>
            
            <form action="${modifyPath}" method="POST" class="space-y-6">
                ${
                  isEditing
                    ? `<input type="hidden" name="id" value="${entityToModify._id}">`
                    : ""
                }
                
                ${fieldHtml}

                <div class="pt-4">
                    <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out">
                        ${submitText}
                    </button>
                    <a href="${listPath}" class="mt-3 block w-full text-center py-2 px-4 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition duration-150 ease-in-out">
                        Abbrechen
                    </a>
                </div>
            </form>
        </div>
    `;
}

/**
 * Generiert das HTML für die Löschbestätigungsseite.
 * @param {object} config - Konfigurationsobjekt (entityName, listPath)
 * @param {object} entityToDelete - Das zu löschende Objekt
 * @returns {string} Das vollständige HTML für die Löschbestätigung.
 */
function renderConfirmDelete({ config, entityToDelete }) {
  const { entityName, listPath } = config;

  // Erzeugt eine einfache Liste der Details für die Bestätigung
  const detailHtml = Object.keys(entityToDelete)
    .filter((key) => key !== "password" && key !== "__v")
    .map(
      (key) => `
        <p class="text-sm text-gray-600">
            <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${
        entityToDelete[key]
      }
        </p>
    `
    )
    .join("");

  return `
        <div class="max-w-xl mx-auto mt-10 p-8 bg-white shadow-2xl rounded-lg border border-red-200">
            <h2 class="text-3xl font-extrabold text-red-700 mb-6 text-center">Wirklich ${entityName} löschen? ⚠️</h2>
            
            <p class="text-lg text-gray-700 mb-6 text-center">
                Sind Sie sicher, dass Sie diesen ${entityName} **dauerhaft** löschen möchten? 
                Diese Aktion kann **nicht** rückgängig gemacht werden.
            </p>

            <div class="border border-gray-200 p-4 rounded-md mb-8 bg-gray-50">
                <h3 class="text-xl font-bold mb-2 text-gray-800">${entityName}-Details</h3>
                ${detailHtml}
            </div>

            <div class="flex justify-between space-x-4">
                <form action="${listPath}/delete/${entityToDelete._id}" method="POST" class="w-1/2">
                    <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out">
                        🗑️ Ja, endgültig löschen
                    </button>
                </form>

                <a href="${listPath}" class="w-1/2 flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                    Abbrechen
                </a>
            </div>
        </div>
    `;
}

module.exports = {
  renderList,
  renderModifyForm,
  renderConfirmDelete,
};
