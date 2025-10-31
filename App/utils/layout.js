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
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                /* --- Global Styles --- */
                body { 
                    font-family: 'Arial', sans-serif; 
                    background-color: #f4f7f6; /* Light gray background */
                    padding: 40px; 
                    margin: 0;
                }
                .container { 
                    max-width: 800px; 
                    margin: auto; 
                    background: white; 
                    padding: 20px 40px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); 
                }
                h1, h2 { 
                    color: #00796b; /* Teal color */
                    border-bottom: 2px solid #e0f7fa; 
                    padding-bottom: 10px; 
                }
                a { 
                    color: #00796b; 
                    text-decoration: none; 
                    font-weight: bold; 
                }
                a:hover {
                    text-decoration: underline;
                }

                /* --- Page Specific Styles --- */
                ${styles}
            </style>
        </head>
        <body>
            <div class="container">
                ${bodyContent}
            </div>
        </body>
        </html>
    `;
};

module.exports = generateLayout;
