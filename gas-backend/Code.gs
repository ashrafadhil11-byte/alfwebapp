// Global variable for the Spreadsheet to make it easy to reference
const SPREADSHEET_ID = '1Ow89TPLCthYb7xXPBJzYtbDrm8-yMBNsJZMqQIN-rRU';

/**
 * Renders the initial web application.
 */
function doGet(e) {
  // We start by serving the Index.html file
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Al Farha Cargo - System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper function to include external HTML/CSS/JS files into the main Index.html
 * This keeps our frontend code modular and clean.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
/**
 * Returns the URL of the published web app. 
 * Used for hard-refreshing the page during logout.
 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}