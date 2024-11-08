import express from "express";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { winstonLogger } from "./utils/winstonLogger.js";
import globalErrorHandlingMiddlewareController from "./controllers/errorController.js";
import { toDoItemRouter, closingPool } from "./routes/toDoItemRouter.js";
//command to run this file:  node ./serverToDoItems.js
/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const toDoItemsWinstonLogger = winstonLogger;
toDoItemsWinstonLogger.info("Start of variable definition.");
const app = express();
const port = 4000;
const _dirname = dirname(fileURLToPath(import.meta.url));
//let pool;
let server;

toDoItemsWinstonLogger.info("_dirname:" + _dirname);
toDoItemsWinstonLogger.info("End of variable definition.");

/*Catches exceptions that were not handled in the code. So this is the last place for the node process to catch the error and gracefully handle it.
This is near the top of the js file as we want it to be run before the code below it is run, so that it can catch any uncaught exceptiosn that happend below it. If this code is at the bottom of this js file, it will be run after the rest of code in this file, so if the code above it throws an uncaght exception then this code wont catch the uncaught exception as it is run after the uncaught exception.
So any exception to caught by express will be handled here. 
exit 1: is used for uncaught exceptions.
*/
await process.on("uncaughtException", async (error) => {
  toDoItemsWinstonLogger.error(
    "Error log: uncaughtException: " +
      error.name +
      ": " +
      error.message +
      " : " +
      error.stack
  );
  //to do: send out email and restart processes automatically https://www.youtube.com/watch?v=vAH4GRWbAQw
  //to do: do some checks to determine status of services and database
  toDoItemsWinstonLogger.info(
    "uncaughtException. Closing db connection pool, from server."
  );
  await closingPool();
  toDoItemsWinstonLogger.info(
    "uncaughtException. Closed db connection pool, from server."
  );
  if (server != undefined) {
    await server.close(async () => {
      toDoItemsWinstonLogger.info(
        "uncaughtException. Express server closed. Node process now closing."
      );
      toDoItemsWinstonLogger.info("uncaughtException. Exiting process.");
      process.exit(1);
    }); // give server time to close first and then the callback to exit the node process is called. since the process has exited, if a user makes a request to the system, he will not get a response.
  }
});

//throw new Error("test uncaughtException");

toDoItemsWinstonLogger.info(
  "Info log: middleware app.use statments starting, in server"
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
toDoItemsWinstonLogger.info(
  "Info log: midleware app.use statments ending, in server"
);

app.use("/api/v1/items", toDoItemRouter);

/*Handling all endpoint requests that are invalid.*/
app.all("*", async (req, res) => {
  toDoItemsWinstonLogger.info("Info log: app.all * func start, in server.");
  res.send({ error: "The URL you entered is not valid." });
  toDoItemsWinstonLogger.info("Info log: app.all * func end, in server.");
});

/*Global error handling middleware.*/
app.use(globalErrorHandlingMiddlewareController);

/*If the nodejs process is terminated maully, this code will execute and can be used to do any action that need to be done b4 the node process ends, so that it gracefully shuts down the node process.*/
await process.on("SIGINT", async () => {
  toDoItemsWinstonLogger.info("Info log: SIGINT.");
  //to do: send out email and restart processes automatically https://www.youtube.com/watch?v=vAH4GRWbAQw
  //to do: do some checks to determine status of services and database
  toDoItemsWinstonLogger.info("SIGINT. Closing db connection pool.");
  await closingPool();
  toDoItemsWinstonLogger.info("SIGINT. Closed db connection pool.");
  if (server != undefined) {
    await server.close(async () => {
      toDoItemsWinstonLogger.info(
        "SIGINT. Express server closed. Node process now closing."
      );
      toDoItemsWinstonLogger.info("SIGINT. Exiting process.");
      process.exit(0);
    }); // give server time to close first and then the callback to exit the node process is called. since the process has exited, if a user makes a request to the system, he will not get a response.
  }
});

//To test unhandled rejections are accomodated for
// const p = new Promise((_, reject) => {
//   reject(new Error("This is a test unhandled rejection!"));
// });

/*This is called if an async function has an unhandled promise rejection. If this was not here, then the rejected promise would eventually be caught by the uncaughtException in process.on.*/
await process.on("unhandledRejection", async (reason, promise) => {
  toDoItemsWinstonLogger.error(
    "Error log: unhandledRejection: reason.name:" +
      reason.name +
      "; reason.message: " +
      reason.message +
      ";  reason.stack:" +
      reason.stack +
      "; promise:" +
      promise
  );
  //to do: send out email and restart processes automatically https://www.youtube.com/watch?v=vAH4GRWbAQw
  //to do: do some checks to determine status of services and database
  toDoItemsWinstonLogger.info(
    "unhandledRejection. Closing db connection pool, in server."
  );
  await closingPool();
  toDoItemsWinstonLogger.info(
    "unhandledRejection. Closed db connection pool, in server."
  );
  if (server != undefined) {
    await server.close(async () => {
      toDoItemsWinstonLogger.info(
        "unhandledRejection. Express server closed. Node process now closing, in server."
      );
      toDoItemsWinstonLogger.info(
        "unhandledRejection. Exiting process, in server."
      );
      process.exit(1);
    }); // give server time to close first and then the callback to exit the node process is called. since the process has exited, if a user makes a request to the system, he will not get a response.
  }
});

/*Listening on port.*/
server = app.listen(port, () => {
  toDoItemsWinstonLogger.info(`Server running on port ${port}`);
});
