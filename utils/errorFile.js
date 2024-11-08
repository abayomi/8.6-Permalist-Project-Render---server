import { winstonLogger } from "./winstonLogger.js";
const toDoItemsWinstonLogger = winstonLogger;


/*All errors send the same user friendly error page.*/
function sendErrorFile(res, errorMessage) {
  toDoItemsWinstonLogger.info("Info log: sendErrorFile func start, in apigateway.");
  res.send({ error: errorMessage });
  toDoItemsWinstonLogger.info("Info log: sendErrorFile func end, in apigateway.");
}
export { sendErrorFile };
