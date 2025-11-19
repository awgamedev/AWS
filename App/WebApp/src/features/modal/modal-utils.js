const path = require("path");
const ejs = require("ejs");
const fs = require("fs");

/**
 * Renders modal content using EJS templates
 */
function renderModalContent(viewsPath, templateName, users, translator) {
  const templatePath = path.join(viewsPath, templateName);
  const template = fs.readFileSync(templatePath, "utf-8");
  return ejs.render(template, { users, __: translator });
}

module.exports = {
  renderModalContent,
};
