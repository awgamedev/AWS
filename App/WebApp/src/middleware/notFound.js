const generateLayout = require("../utils/layout");

/**
 * 404-Middleware (Catch-All-Handler).
 * Diese Funktion wird aufgerufen, wenn keine andere Express-Route
 * für den angeforderten Pfad gefunden wurde.
 * @param {object} req - Express Request Objekt (beinhaltet req.url)
 * @param {object} res - Express Response Objekt
 * @param {function} next - Nächste Middleware-Funktion (wird hier nicht aufgerufen)
 */
const notFoundHandler = (req, res, next) => {
  // 1. Setzt den HTTP-Statuscode auf 404 (Not Found)
  res.status(404);

  var style = `
    .not-found-container {
        text-align: center;
        margin-top: 50px;
    }
    .not-found-container h1 {
        font-size: 6em;
        margin-bottom: 0;
        color: #ff6f61;
    }
    .not-found-container h2 {
        font-size: 2em;
        margin-top: 0;
        color: #333;
    }
    .not-found-container p {
        font-size: 1.2em;
        color: #666;
    }
    .not-found-container a {
        color: #00796b;
        text-decoration: none;
    }
    .not-found-container a:hover {
        text-decoration: underline;
    }
  `;

  const content = `
    <div class="not-found-container">
        <h1>404</h1>
        <h2>Seite nicht gefunden</h2>
        <p>Die angeforderte URL: <b>${req.originalUrl}</b> konnte nicht gefunden werden.</p>
        <p><a href="/">Zurück zur Startseite</a></p>
    </div>
`;

  const htmlResponse = generateLayout(
    "Submit a Message",
    content,
    req.path,
    style
  );

  // 3. Sendet die Antwort
  res.send(htmlResponse);
};

module.exports = { notFoundHandler };
