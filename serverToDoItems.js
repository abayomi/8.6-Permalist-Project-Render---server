import express from "express";
import Pool from "pg-pool";
import env from "dotenv";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import winston from "winston";
import "./utils/winstonLogger.js";
import {
  tryCatchAsyncController,
  checkIsNotUndefined,
} from "./utils/tryCatch-checkUndefined.js";
import globalErrorHandlingMiddlewareController from "./controllers/errorController.js";
import EventEmitter from "events";

/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const toDoItemsWinstonLogger = winston.loggers.get("toDoItemsWinstonLogger");

toDoItemsWinstonLogger.info("Start of variable definition.");
const app = express();
const port = 4000;
const _dirname = dirname(fileURLToPath(import.meta.url));
let pool;
let server;
const emitter = new EventEmitter();
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
  toDoItemsWinstonLogger.info("uncaughtException. Closing db connection pool.");
  if (pool != undefined) await pool.end();
  //console.log("pool:" + pool);
  toDoItemsWinstonLogger.info("uncaughtException. Closed db connection pool.");
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

toDoItemsWinstonLogger.info("Info log: setting up program to read env file.");
env.config();
toDoItemsWinstonLogger.info("Info log: new pg client creating.");

/* ssl: true needs to be there to prevent the error below which showed up on the console:
"connection error Error: read ECONNRESET at TCP.onStreamRead (node:internal/stream_base_commons:218:20) "
@param max: is maximum number of connections, default 10
@param connectionTimeoutMillis: if all connections are busy, a request will wait for a free connection. this timeout is how long the code will wait to get a free conneciton before rejecting your request for a db connection. default is 0 and means to wait forever.
@param idleTimeoutMillis: after a connection is established, if it is not used, then get rid of it after a period of time as it takes up memory. 0 means it will never get destroyed. default is 10000 .
@param allowExitOnIdle:  Setting `allowExitOnIdle: true` in the config will allow the node event loop to exit as soon as all clients in the pool are idle, even if their socket is still open to the postgres server. If allowExitOnIdle is false, then the node event loop will exit if the pool is closed or if all the database connections are closed. False is the default. However existing, does not mean that the event loop terminates. It means the event loop is as active as it would be if there were events to process.
*/
pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.DB_PORT,
  ssl: true,
  max: 10,
  ConnectionTimeoutMillis: 0,
  idleTimeoutMillis: 10000,
  allowExitOnIdle: false,
});

/*Pool class extends event emitter node class, so we can tap into events emitted on the pool by using the on method. Below we detect when there is an error emitted by the pool and handle it. */
pool.on("error", (err) => {
  toDoItemsWinstonLogger.error(
    "error log: something has gone wrong with db connection!",
    err.stack
  );
});

toDoItemsWinstonLogger.info("Info log: middleware starting, in server");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
toDoItemsWinstonLogger.info("Info log: midleware ending, in server");

let items = [];

/*Having this code in a function allows us to have one central place to make and release connections for simple queries so that this code can be updates in one place. Instead of using pool.query to make the connection, run teh query and release the connection in one line, we have 3 sepearte lines for these three operations. This will allow faster debugging when there is an issue, as we will know quickly which of these three operations caused the error.*/
async function performQueryReturnResult(queryStatement) {
  //Promise is returned so that calling function will wait on function result to be obtained before continuing with the steps after the function call
  return new Promise((resolve, reject) => {
    toDoItemsWinstonLogger.info(
      "Info log: Creating database connection, in performQueryReturnResult, in server."
    );
    let result;
    const y = pool.connect(async (err, client, release) => {
      if (err) {
        toDoItemsWinstonLogger.error(
          "Error log: Creating database connection crashed, so exiting, in performQueryReturnResult, in server."
        );
        emitter.emit("queryCompleted");
        resolve([undefined, undefined]);
      }
      toDoItemsWinstonLogger.info(
        "Info log: query sending to DB, in performQueryReturnResult, in server."
      );
      client.query(queryStatement, (err, res) => {
        toDoItemsWinstonLogger.info(
          "Info log: releasing connection back to pool, in performQueryReturnResult, in server."
        );
        release(); //Accepts a truthy value which, when true, will destroy the client, instead of returning it to the pool. We want to realse the client as soon as possible so that other suers can use it.
        if (err) {
          toDoItemsWinstonLogger.error(
            "Error log: Error running query on db, in performQueryReturnResult, in server."
          );
          resolve([undefined, undefined]);
        }
        toDoItemsWinstonLogger.info(
          "Info log: Results obtained from query on db, in performQueryReturnResult, in server."
        );
        resolve([res.rows, undefined]);
      });
    });
  });
}

/*Getting items from database.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.*/
async function getItems() {
  toDoItemsWinstonLogger.info("Info log: Starting getItems, in server.");
  let response = await performQueryReturnResult("select * from items");
  toDoItemsWinstonLogger.info("Info log: Ending getItems, in server.");
  return response;
}

/*Getting all items on a to do list.*/
app.get(
  "/items",
  tryCatchAsyncController(async (req, res, next) => {
    toDoItemsWinstonLogger.info(
      "Info log: starting fetching items, in server."
    );
    req.messageInEventOfErrorDuringExecutionOfQuery =
      "Error while getting items";
    const response = await getItems();
    if (response[1] == undefined) {
      toDoItemsWinstonLogger.info(
        "Info log: There were no errors while fetching items, in server."
      );
      res.send({ listTitle: "ARC To Do List", listItems: response[0] });
    } else res.send({ error: "Fetching items failed." });
    toDoItemsWinstonLogger.info("Info log: ending fetching items in, server.");
  })
);

/*Adding an item to the to do list.*/
app.post(
  "/addItem",
  tryCatchAsyncController(async (req, res) => {
    toDoItemsWinstonLogger.info("Info log: starting adding an item in server");
    toDoItemsWinstonLogger.info("req.body:" + JSON.stringify(req.body));
    const item = req.body.newItem;
    if (item != undefined) {
      let response = await performQueryReturnResult(
        `insert into items (title) values('${item}')`
      );
      res.send({ message: "Success" });
      toDoItemsWinstonLogger.info("Info log: ending adding an item in server");
    } else {
      res.send({ error: "Your last operation encountered an error." });
      toDoItemsWinstonLogger.error(
        "Error log: there was no item sent to the server but the add method was called."
      );
    }
  })
);

/*Updating an item on a to do list.*/
app.patch(
  "/editItem",
  tryCatchAsyncController(async (req, res) => {
    toDoItemsWinstonLogger.info("Info log: starting editing an item in server");
    let updatedItemTitle = req.body.updatedItemTitle;
    let updatedItemId = req.body.updatedItemId;
    toDoItemsWinstonLogger.info(req.body);
    if (updatedItemId != undefined && updatedItemTitle != undefined) {
      let response = performQueryReturnResult(
        `update items set title='${updatedItemTitle}' where id='${updatedItemId}'`
      );
      res.send({ message: "Success" });
      toDoItemsWinstonLogger.info("Info log: ending editing an item in server");
    } else {
      res.send({ error: "Your last operation encountered an error." });
      toDoItemsWinstonLogger.error(
        "Error log: either the item's ID or body were missing, but the edit method was called."
      );
    }
  })
);

/*Deleting an item on a to do list.*/
app.delete(
  "/deleteItem",
  tryCatchAsyncController(async (req, res) => {
    toDoItemsWinstonLogger.info(
      "Info log: starting deleteing an item in server"
    );
    toDoItemsWinstonLogger.info(
      "Info log: req.body.data.deleteItemId:" + req.body.deleteItemId
    );
    let deleteItemId = parseInt(req.body.deleteItemId);
    if (deleteItemId != undefined) {
      let response = performQueryReturnResult(
        `delete from items where id=${deleteItemId}`
      );
      res.send({ message: "Success" });
      toDoItemsWinstonLogger.info(
        "Info log: ending deleteing an item in server"
      );
    } else {
      res.send({ error: "Your last operation encountered an error." });
      toDoItemsWinstonLogger.error(
        "Error log: there was no id sent to the server but the delete method was called."
      );
    }
  })
);

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
  if (pool != undefined) await pool.end();
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

// const p = new Promise((_, reject) => {
//   reject(new Error("This is a test unhandled rejection!"));
// });

/*This is called if an async function has an unhandled promise rejection. If this was not here, then the rejected promise would eventually be caught by the uncaughtException in process.on.*/
await process.on("unhandledRejection", async (error) => {
  toDoItemsWinstonLogger.error(
    "Error log: unhandledRejection: " +
      error.name +
      ": " +
      error.message +
      " : " +
      error.stack
  );
  //to do: send out email and restart processes automatically https://www.youtube.com/watch?v=vAH4GRWbAQw
  //to do: do some checks to determine status of services and database
  toDoItemsWinstonLogger.info(
    "unhandledRejection. Closing db connection pool."
  );
  if (pool != undefined) await pool.end();
  toDoItemsWinstonLogger.info("unhandledRejection. Closed db connection pool.");
  if (server != undefined) {
    await server.close(async () => {
      toDoItemsWinstonLogger.info(
        "unhandledRejection. Express server closed. Node process now closing."
      );
      toDoItemsWinstonLogger.info("unhandledRejection. Exiting process.");
      process.exit(1);
    }); // give server time to close first and then the callback to exit the node process is called. since the process has exited, if a user makes a request to the system, he will not get a response.
  }
});

/*Listening on port.*/
server = app.listen(port, () => {
  toDoItemsWinstonLogger.info(`Server running on port ${port}`);
});
