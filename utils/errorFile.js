import Debug from "debug";

const debugInfo = Debug("errorFile-info-logs");
const debugError = Debug("errorFile-error-logs");

/*All errors send the same user friendly error page.*/
function sendErrorFile(res, errorMessage) {
  debugInfo("Info log: sendErrorFile func start, in apigateway.");
  res.render("error.ejs");
  debugInfo("Info log: sendErrorFile func end, in apigateway.");
}
export { sendErrorFile };
