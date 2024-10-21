import Debug from "debug";
import { sendErrorFile } from "../utils/errorFile.js";

const debugInfo = Debug("errorController-info-logs");
const debugError = Debug("errorController-error-logs");

/*Global error handling middleware defined.*/
const globalErrorHandlingMiddlewareController = (error, req, res, next) => {
  debugError(
    `Error log: Global error handling middleware start, in apigateway.`
  );
  //For now I have decided I wont send the error back to the user. The lines of code to amend the error and res.status remain below while I think about whether to use them.
  //If the error has no status code, we set a status code of 500 which means internal server error.
  error.statusCode = error.statusCode || 500; //not used right now, is for res.status.
  //If the error has no error status, the status of "error" is set.
  //Error status means that we either have a 400 error which is a client error or a 500 error which is a server error.
  error.status = error.status || "error"; //not used right now, is for res.status.
  //res.status(error.statusCode).json({ status: error.statusCode, message: error.message }); //commented out until I decide to res.status instead of sendErrorFile.
  sendErrorFile(res);
  debugError(`Error log: Global error handling middleware end, in apigateway.`);
};

export default globalErrorHandlingMiddlewareController;
