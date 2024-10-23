import winston from "winston";
import "./winstonLogger.js";

/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const toDoItemsWinstonLogger = winston.loggers.get("toDoItemsWinstonLogger");

/*take a function as an input, call it controller and return an aync function that wraps the input function in a try catch block. */
function tryCatchAsyncController(controller) {
  return async (req, res, next) => {
    toDoItemsWinstonLogger.info("Info log: Start of tryCatch(controller).");
    try {
      //   const err = new Error("fake");
      //   throw err;
      await controller(req, res, next);
    } catch (error) {
      toDoItemsWinstonLogger.error(
        "Error log: " + req.messageInEventOfErrorDuringExecutionOfQuery
      );
      next(error); //will call global error handling middleware
    } finally {
      toDoItemsWinstonLogger.info("Info log: End of tryCatch(controller).");
    }
  };
}

function checkIsNotUndefined(
  arrayOfItemsThatCannotBeUndefined,
  messageIfDataIsUndefined,
  next
) {
  for (let item of arrayOfItemsThatCannotBeUndefined) {
    if (item == undefined) {
      debugError(messageIfDataIsUndefined);
      const error = new CustomError(messageIfDataIsUndefined, 404);
      next(error);
      return false;
    }
  }
  return true;
}

export { tryCatchAsyncController, checkIsNotUndefined };
