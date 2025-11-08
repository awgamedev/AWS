const getPriorityColor = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-500 text-white";
    case "medium":
      return "bg-yellow-500 text-gray-800";
    case "low":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

// Hilfsfunktion: Fügt Tage zu einem Datum hinzu
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Passe den Tag an, sodass 0 = Sonntag, 1 = Montag, ..., 6 = Samstag.
  // Wir wollen Montag (1) als Start der Woche.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const generateTaskModal = (users) => {
  // Optionen für das Mitarbeiter-Dropdown
  const userOptions = users
    .map((user) => `<option value="${user._id}">${user.username}</option>`)
    .join("");

  const priorityOptions = ["low", "medium", "high"]
    .map((priority) => `<option value="${priority}">${priority}</option>`)
    .join("");

  return `
        <div id="task-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center transition-opacity duration-300 ease-out">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-transform duration-300 ease-out scale-95 opacity-0" id="task-modal-content">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-xl font-semibold text-gray-800">Neue Aufgabe zuweisen</h3>
                    <button id="close-task-modal" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <form id="create-task-form">
                    <div class="mb-4">
                        <label for="userId" class="block text-sm font-medium text-gray-700">Mitarbeiter zuweisen</label>
                        <select id="userId" name="userId" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                            <option value="">-- Wähle Mitarbeiter --</option>
                            ${userOptions}
                        </select>
                    </div>

                    <div class="mb-4">
                        <label for="taskPriority" class="block text-sm font-medium text-gray-700">Priorität wählen *</label>
                        <select id="taskPriority" name="taskPriority" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                            ${priorityOptions}
                        </select>
                    </div>

                    <div class="mb-4">
                        <label for="taskName" class="block text-sm font-medium text-gray-700">Aufgabenname *</label>
                        <input type="text" id="taskName" name="taskName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>

                    <div class="mb-4">
                        <label for="taskDescription" class="block text-sm font-medium text-gray-700">Beschreibung</label>
                        <textarea id="taskDescription" name="taskDescription" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label for="startDate" class="block text-sm font-medium text-gray-700">Startdatum *</label>
                            <input type="date" id="startDate" name="startDate" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div>
                            <label for="endDate" class="block text-sm font-medium text-gray-700">Fälligkeitsdatum (Optional)</label>
                            <input type="date" id="endDate" name="endDate" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                    </div>
                    
                    <div id="task-form-message" class="mb-4 text-sm font-medium text-center hidden"></div>

                    <div class="flex justify-end">
                        <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md">
                            Aufgabe speichern
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
};

const generateEditTaskModal = (users) => {
  // Optionen für das Mitarbeiter-Dropdown
  const userOptions = users
    .map((user) => `<option value="${user._id}">${user.username}</option>`)
    .join("");

  const priorityOptions = ["low", "medium", "high"]
    .map((priority) => `<option value="${priority}">${priority}</option>`)
    .join("");

  // Optionen für den Status
  const statusOptions = [
    { value: "pending", label: "Ausstehend" },
    { value: "in-progress", label: "In Bearbeitung" },
    { value: "completed", label: "Abgeschlossen" },
  ];
  const statusOptionsHtml = statusOptions
    .map((s) => `<option value="${s.value}">${s.label}</option>`)
    .join("");

  return `
    <div id="edit-task-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center transition-opacity duration-300 ease-out">
        <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-transform duration-300 ease-out scale-95 opacity-0" id="edit-task-modal-content">
            <div class="flex justify-between items-center mb-4 border-b pb-3">
                <h3 class="text-xl font-semibold text-gray-800">Aufgabe bearbeiten</h3>
                <button id="close-edit-task-modal" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form id="edit-task-form">
                <input type="hidden" id="edit-taskId" name="taskId">

                <div class="mb-4">
                    <label for="edit-taskStatus" class="block text-sm font-medium text-gray-700">Status *</label>
                    <select id="edit-taskStatus" name="taskStatus" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                        ${statusOptionsHtml}
                    </select>
                </div>

                <div class="mb-4">
                    <label for="edit-userId" class="block text-sm font-medium text-gray-700">Mitarbeiter zuweisen *</label>
                    <select id="edit-userId" name="userId" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                        ${userOptions}
                    </select>
                </div>

                <div class="mb-4">
                    <label for="taskPriority" class="block text-sm font-medium text-gray-700">Priorität wählen *</label>
                    <select id="taskPriority" name="taskPriority" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                        ${priorityOptions}
                    </select>
                </div>

                <div class="mb-4">
                    <label for="edit-taskName" class="block text-sm font-medium text-gray-700">Aufgabenname *</label>
                    <input type="text" id="edit-taskName" name="taskName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                </div>

                <div class="mb-4">
                    <label for="edit-taskDescription" class="block text-sm font-medium text-gray-700">Beschreibung</label>
                    <textarea id="edit-taskDescription" name="taskDescription" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label for="edit-startDate" class="block text-sm font-medium text-gray-700">Startdatum *</label>
                        <input type="date" id="edit-startDate" name="startDate" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label for="edit-endDate" class="block text-sm font-medium text-gray-700">Fälligkeitsdatum (Optional)</label>
                        <input type="date" id="edit-endDate" name="endDate" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                </div>
                
                <div id="edit-task-form-message" class="mb-4 text-sm font-medium text-center hidden"></div>

                <div class="flex justify-between">
                    <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md">
                        Änderungen speichern
                    </button>
                </div>
            </form>
        </div>
    </div>
    `;
};

module.exports = {
  getPriorityColor,
  addDays,
  getStartOfWeek,
  generateTaskModal,
  generateEditTaskModal,
};
