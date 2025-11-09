/**
 * Rendert das Hauptlayout mit dem zuvor gerenderten Content-String.
 */
const renderWithLayout = (req, res, title, contentHtml, styles = "") => {
  // res.render() für das Layout, welches den contentHtml als bodyContent enthält
  res.render("layout", {
    title: title,
    styles: styles,
    bodyContent: contentHtml,
  });
};

/**
 * Rendert eine innere EJS-View und bettet sie in das Hauptlayout ein.
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {string} viewName - Name der EJS-View (z.B. 'tasks/all_tasks')
 * @param {string} title - Seitentitel
 * @param {object} innerLocals - Variablen für die innere View
 * @param {string} specificStyles - Spezifische CSS-Styles (optional)
 * @param {number} statusCode - HTTP-Statuscode (optional)
 */
const renderView = (
  req,
  res,
  viewName,
  title,
  innerLocals = {},
  specificStyles = "",
  statusCode = 200
) => {
  res.status(statusCode);

  const viewLocals = {
    ...innerLocals,
    __: req.__ || ((key) => key),
  };

  // 1. Innere View als String rendern
  req.app.render(viewName, viewLocals, (err, contentHtml) => {
    if (err) {
      console.error(`Error rendering view ${viewName}:`, err);
      // Fallback: Einfaches Rendering der Fehlerseite
      const fallbackContent = `<div class="text-red-500 p-8"><h1>Fehler</h1><p>Ein interner Rendering-Fehler ist aufgetreten.</p></div>`;
      return renderWithLayout(req, res, "Fehler", fallbackContent, "");
    }

    // 2. Layout mit dem gerenderten Content rendern
    renderWithLayout(req, res, title, contentHtml, specificStyles);
  });
};

module.exports = {
  renderView,
  renderWithLayout,
};
