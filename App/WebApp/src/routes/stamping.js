const express = require("express");
const router = express.Router();
const Stamping = require("../models/Stamping"); // Dein Stamping-Model
const generateLayout = require("../utils/layout"); // Deine Layout-Funktion
const { ensureAuthenticated } = require("../middleware/auth"); // Deine Authentifizierungs-Middleware

// NEU: Array der erlaubten Stempelungsgründe (muss im POST-Handler für die Validierung zugänglich sein)
const ALLOWED_REASONS = ["Kühe melken", "Feldarbeit", "Büroarbeit"];

// ⏳ GET Route: Stempel-Interface anzeigen (/stamping-interface)
// Zeigt den aktuellen Status an und bietet die Stempel-Buttons.
router.get("/stamping", ensureAuthenticated, async (req, res) => {
  let lastStamping;
  let currentStatus = "out";
  let lastStampingTime = "N/A";

  try {
    // Die userId des eingeloggten Benutzers
    const userId = req.user.id;

    // Letzten Stempel-Eintrag abrufen
    lastStamping = await Stamping.findOne({ userId }).sort({ date: -1 }).exec();

    if (lastStamping) {
      currentStatus = lastStamping.stampingType;
      // Zeit in einem lesbaren Format (z.B. "HH:MM Uhr")
      lastStampingTime = lastStamping.date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch (error) {
    console.error("Fehler beim Abrufen des Stempelstatus:", error.message);
    // Fehlerbehandlung kann hier hinzugefügt werden (z.B. Status bleibt 'out')
  }

  // --- HTML-Content basierend auf dem aktuellen Status ---

  // Dynamische Hervorhebung und Button-Texte
  const statusText =
    currentStatus === "in"
      ? "Eingestempelt (Arbeitszeit läuft)"
      : "Ausgestempelt (Pause/Feierabend)";

  // Funktion zur formatierung der Zeit, jetzt kompakt und nur Zeit
  const formatTime = (stamping) => {
    if (!stamping) return "";
    return stamping.date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Funktion zur formatierung des Datums
  const formatDate = (stamping) => {
    if (!stamping) return "";
    return stamping.date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const stampingListHtml = await (async () => {
    try {
      const userId = req.user.id;
      // Holen Sie alle Stempelungen und sortieren Sie sie aufsteigend nach Datum,
      const stampings = await Stamping.find({ userId })
        .sort({ date: 1 }) // Wichtig: Aufsteigend sortieren
        .exec();

      let currentIn = null;
      const pairs = [];

      // Paar-Bildungs-Logik (wie zuvor)
      for (const stamp of stampings) {
        if (stamp.stampingType === "in") {
          if (currentIn) {
            pairs.push({ come: currentIn, go: null });
          }
          currentIn = stamp;
        } else if (stamp.stampingType === "out") {
          if (currentIn) {
            pairs.push({ come: currentIn, go: stamp });
            currentIn = null;
          }
        }
      }

      if (currentIn) {
        pairs.push({ come: currentIn, go: null });
      }

      // Sortiere die Paare für die Anzeige absteigend (die neuesten Paare zuerst)
      pairs.reverse();

      return pairs
        .map((pair) => {
          const dateStr = formatDate(pair.come); // Datum basiert auf Kommen-Zeitpunkt
          const comeTime = formatTime(pair.come);
          const goTime = formatTime(pair.go);
          // NEU: Grund aus dem "in"-Stempelungseintrag abrufen
          const reason = pair.come.stampingReason || "N/A";

          // Kompakte Darstellung der Zeiten
          const timeDisplay = pair.go
            ? `${comeTime} - ${goTime}`
            : `${comeTime} - **OFFEN**`;

          // Farbe und Text für Status
          const statusText = pair.go ? "Abgeschlossen" : "Aktiv";
          const statusColor = pair.go
            ? "text-gray-500 bg-gray-100"
            : "text-white bg-blue-600";
          const statusPadding = pair.go ? "px-2 py-0.5" : "px-3 py-1";
          const statusRing = pair.go ? "border-gray-300" : "border-blue-600";

          return `<li class="py-4 border-b border-gray-100 flex justify-between items-center">
                    <div class="flex flex-col flex-grow">
                        <div class="flex justify-between items-start">
                            <div class="flex-shrink-0">
                                <span class="text-sm text-gray-700 font-medium mr-4">${dateStr}</span>
                                <span class="inline-flex items-center rounded-full ${statusColor} ${statusPadding} text-xs font-semibold border ${statusRing}">
                                    ${statusText}
                                </span>
                            </div>
                            <div class="text-lg font-mono tracking-wider text-gray-900">
                                ${timeDisplay}
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Grund: ${reason}</p>
                    </div>
                </li>`;
        })
        .join("");
    } catch (err) {
      console.error("Fehler beim Abrufen der Stempelungen:", err.message);
      return '<li class="py-3 text-gray-500">Fehler beim Laden der Stempelungen.</li>';
    }
  })();

  // NEU: HTML für das Dropdown-Menü-Optionen
  const reasonOptions = ALLOWED_REASONS.map(
    (reason) => `<option value="${reason}">${reason}</option>`
  ).join("");

  const content = `
        <h1 class="text-3xl font-bold text-gray-900 mb-6">Zeiterfassung Mitarbeiter</h1>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 ${
              currentStatus === "in" ? "border-green-600" : "border-red-600"
            }">
                <div class="flex items-center">
                    <div class="flex-shrink-0 p-3 rounded-full ${
                      currentStatus === "in" ? "bg-green-100" : "bg-red-100"
                    }">
                        ${
                          currentStatus === "in"
                            ? '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.504A9 9 0 0012 1h.01a9 9 0 003.78 17.614l-2.022 2.023a1 1 0 01-1.414 0l-2.022-2.023A9 9 0 0012 12M12 12v.01"></path></svg>'
                            : '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                        }
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500">Aktueller Status</p>
                        <p class="text-3xl font-bold text-gray-900">${statusText}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-gray-400">
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-gray-100 p-3 rounded-full">
                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500">Letzter Stempelvorgang</p>
                        <p class="text-3xl font-bold text-gray-900">${lastStampingTime}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Aktion wählen</h2>
            <p id="stamping-message" class="mb-4 font-medium text-sm text-gray-600">Bereit zum ${
              currentStatus === "in" ? "Ausstempeln" : "Einstempeln"
            }.</p>
            
            <div id="reason-selection" class="mb-4 ${
              currentStatus === "in" ? "hidden" : ""
            }">
                <label for="stamping-reason" class="block text-sm font-medium text-gray-700 mb-1">
                    Grund auswählen (für Einstempelung):
                </label>
                <select id="stamping-reason" name="stamping-reason"
                    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm">
                    <option value="">-- Bitte wählen --</option>
                    ${reasonOptions}
                </select>
                <p id="reason-error" class="text-sm text-red-500 mt-1 hidden">Bitte wähle einen Grund aus.</p>
            </div>
            
            <div class="flex space-x-4">
                
                <button 
                    id="stamp-in-btn"
                    data-type="in"
                    class="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition duration-150 shadow-md ${
                      currentStatus === "in"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }"
                    ${currentStatus === "in" ? "disabled" : ""}
                >
                    <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Jetzt Einstempeln
                </button>
                
                <button 
                    id="stamp-out-btn"
                    data-type="out"
                    class="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-150 shadow-md ${
                      currentStatus === "out"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }"
                    ${currentStatus === "out" ? "disabled" : ""}
                >
                    <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                    Jetzt Ausstempeln
                </button>
            </div>

        <div class="mt-8 bg-white p-6 rounded-xl shadow-lg">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Deine Schichten</h2>
            <div class="border-t border-gray-200">
                <ul class="divide-y divide-gray-200">
                ${
                  stampingListHtml.length > 0
                    ? stampingListHtml
                    : '<li class="py-4 text-gray-500">Noch keine Stempel-Paare vorhanden.</li>'
                }
                </ul>
            </div>
        </div>        

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const stampButtons = document.querySelectorAll('#stamp-in-btn, #stamp-out-btn');
                const messageDiv = document.getElementById('stamping-message');
                // NEU: Elemente für den Grund
                const reasonSelect = document.getElementById('stamping-reason');
                const reasonError = document.getElementById('reason-error');
                const reasonSelectionDiv = document.getElementById('reason-selection');
                
                // NEU: Sichtbarkeit des Dropdowns bei Statuswechsel
                if ('${currentStatus}' === 'out') {
                    reasonSelectionDiv.classList.remove('hidden');
                } else {
                    reasonSelectionDiv.classList.add('hidden');
                }

                stampButtons.forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const stampingType = event.currentTarget.getAttribute('data-type');
                        
                        // Ignoriere Klick, wenn der Button deaktiviert ist (Visuelle Validierung)
                        if(event.currentTarget.disabled) return;

                        // NEU: Validierung des Grundes beim Einstempeln
                        let stampingReason = null;
                        if (stampingType === 'in') {
                            stampingReason = reasonSelect.value;
                            if (!stampingReason) {
                                reasonError.classList.remove('hidden');
                                messageDiv.textContent = 'Bitte wähle einen Grund für das Einstempeln aus.';
                                messageDiv.classList.remove('text-green-600', 'text-red-600', 'text-yellow-600');
                                messageDiv.classList.add('text-red-600');
                                return; // Abbruch, wenn kein Grund ausgewählt ist
                            }
                            reasonError.classList.add('hidden'); // Fehler verbergen
                        }

                        // Ladezustand anzeigen
                        messageDiv.textContent = 'Verarbeite Stempelvorgang...';
                        messageDiv.classList.remove('text-green-600', 'text-red-600', 'text-gray-600');
                        messageDiv.classList.add('text-yellow-600');
                        
                        try {
                            const response = await fetch('/stamp', { // Passe die URL an
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                // NEU: stampingReason senden
                                body: JSON.stringify({ stampingType, stampingReason }),
                            });

                            const data = await response.json();

                            // Aktualisiere die Nachricht und den Status
                            messageDiv.textContent = data.msg || 'Aktion erfolgreich.';
                            
                            if (response.ok) {
                                messageDiv.classList.remove('text-yellow-600');
                                messageDiv.classList.add('text-green-600');
                                // Seite neu laden, um Status-Anzeige zu aktualisieren
                                setTimeout(() => window.location.reload(), 1000);  
                            } else {
                                messageDiv.classList.remove('text-yellow-600');
                                messageDiv.classList.add('text-red-600');
                            }

                        } catch (error) {
                            messageDiv.textContent = 'Ein Netzwerkfehler ist aufgetreten.';
                            messageDiv.classList.remove('text-yellow-600');
                            messageDiv.classList.add('text-red-600');
                            console.error('Fetch Fehler:', error);
                        }
                    });
                });
            });
        </script>
    `;

  // Sende das generierte Layout zurück
  res.send(generateLayout("Zeiterfassung", content, req.path, req.user));
});

// 📅 POST Route: Mitarbeiter stempelt ein oder aus (/api/stamping)
// Erfordert 'ensureAuthenticated', um auf 'req.user.id' zuzugreifen.
router.post("/stamp", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id; // Nimmt an, dass die User-ID hier gespeichert ist
    // NEU: stampingReason aus dem Body extrahieren
    const { stampingType, stampingReason } = req.body; // Erwartet: "in" oder "out"

    // 1. Validiere den Stempeltyp
    if (!stampingType || !["in", "out"].includes(stampingType)) {
      return res
        .status(400)
        .json({ msg: "Ungültiger Stempeltyp. Erlaubt sind 'in' oder 'out'." });
    }

    // NEU: 1b. Validiere den Grund, falls es ein "in"-Stempel ist
    if (stampingType === "in") {
      if (!stampingReason || !ALLOWED_REASONS.includes(stampingReason)) {
        return res
          .status(400)
          .json({ msg: "Bitte wähle einen gültigen Stempelungsgrund aus." });
      }
    }

    // 2. Finde den letzten Stempelvorgang des Benutzers für die Konsistenzprüfung
    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();

    // 3. Konsistenzprüfung (verhindert doppeltes Ein- oder Ausstempeln)
    if (
      stampingType === "in" &&
      lastStamping &&
      lastStamping.stampingType === "in"
    ) {
      return res
        .status(409)
        .json({ msg: "Fehler: Du bist bereits eingestempelt." });
    }

    // Optional: Blockiere Ausstempeln ohne vorheriges Einstempeln
    if (
      stampingType === "out" &&
      (!lastStamping || lastStamping.stampingType === "out")
    ) {
      return res.status(409).json({
        msg: "Fehler: Du bist bereits ausgestempelt oder hast noch nicht eingestempelt.",
      });
    }

    // 4. Erstelle und speichere den neuen Stamping-Eintrag
    const newStamping = new Stamping({
      userId,
      stampingType,
      // Füge den Grund nur beim Einstempeln hinzu.
      stampingReason: stampingType === "in" ? stampingReason : undefined,
      date: new Date(),
    });

    const stampingEntry = await newStamping.save();

    // 5. Erfolgreiche Antwort
    res.status(201).json({
      msg: `Erfolgreich ${
        stampingType === "in" ? "eingestempelt" : "ausgestempelt"
      } ${
        stampingType === "in" ? `(Grund: ${stampingEntry.stampingReason})` : ""
      } um ${stampingEntry.date.toLocaleTimeString()}.`,
      stamping: stampingEntry,
    });
  } catch (err) {
    console.error("Fehler beim Stempelvorgang:", err.message);
    res
      .status(500)
      .json({ msg: "Serverfehler beim Verarbeiten des Stempelvorgangs." });
  }
});

// 🔎 GET Route: Aktuellen Stempelstatus abrufen (/api/stamping/status)
router.get("/status", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 }) // Der neueste Eintrag
      .exec();

    const status = lastStamping ? lastStamping.stampingType : "out";
    const lastTime = lastStamping ? lastStamping.date : null;

    res.json({
      userId,
      currentStatus: status,
      lastStampingTime: lastTime,
      msg: `Der aktuelle Status ist: ${
        status === "in" ? "Eingestempelt" : "Ausgestempelt"
      }.`,
    });
  } catch (err) {
    console.error("Fehler beim Abrufen des Status:", err.message);
    res.status(500).json({ msg: "Serverfehler beim Abrufen des Status." });
  }
});

module.exports = router;
