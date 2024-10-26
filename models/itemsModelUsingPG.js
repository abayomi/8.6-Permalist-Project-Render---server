import Pool from "pg-pool";
import env from "dotenv";
import winston from "winston";
import "../utils/winstonLogger.js";

/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const toDoItemsWinstonLogger = winston.loggers.get("toDoItemsWinstonLogger");
toDoItemsWinstonLogger.info("Start of variable definition.");
let pool;
toDoItemsWinstonLogger.info("End of variable definition.");

toDoItemsWinstonLogger.info(
  "Info log: setting up program to read env file, in itemsModelUsingPG."
);
env.config();
toDoItemsWinstonLogger.info(
  "Info log: new pg client creating, in itemsModelUsingPG."
);

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
    "error log: something has gone wrong with db connection, in itemsModelUsingPG!",
    err.stack
  );
});

/*Having this code in a function allows us to have one central place to make and release connections for simple queries so that this code can be updates in one place. Instead of using pool.query to make the connection, run teh query and release the connection in one line, we have 3 sepearte lines for these three operations. This will allow faster debugging when there is an issue, as we will know quickly which of these three operations caused the error.
@return : an array with 2 values, the data and any error generated. response[1] will be undefined for the second arg if there are no errors.
Reject: You typically call reject with an error or reason for the failure, which can then be handled in the catch block or with .catch() method when consuming the promise.
Resolve: is used to return the correct values once there is success. 
*/
async function performQueryReturnResult(queryStatement) {
  //Promise is returned so that calling function will wait on function result to be obtained before continuing with the steps after the function call
  return new Promise((resolve, reject) => {
    toDoItemsWinstonLogger.info(
      "Info log: Creating database connection, in performQueryReturnResult, in itemsModelUsingPG."
    );
    const y = pool.connect(async (err, client, release) => {
      if (err) {
        toDoItemsWinstonLogger.error(
          "Error log: Creating database connection crashed, so exiting, in performQueryReturnResult, in itemsModelUsingPG."
        );
        resolve([undefined, err]);
        return;
      }
      toDoItemsWinstonLogger.info(
        "Info log: query sending to DB, in performQueryReturnResult, in itemsModelUsingPG."
      );
      client.query(queryStatement, (err, res) => {
        toDoItemsWinstonLogger.info(
          "Info log: releasing connection back to pool, in performQueryReturnResult, in itemsModelUsingPG."
        );
        release(); //Accepts a truthy value which, when true, will destroy the client, instead of returning it to the pool. We want to realse the client as soon as possible so that other suers can use it.
        if (err) {
          toDoItemsWinstonLogger.error(
            "Error log: Error running query on db, in performQueryReturnResult, in itemsModelUsingPG."
          );
          resolve([undefined, err]);
          return;
        }
        toDoItemsWinstonLogger.info(
          "Info log: Results obtained from query on db, in performQueryReturnResult, in itemsModelUsingPG."
        );
        resolve([res.rows, undefined]);
      });
    });
  });
}

/*Getting items from database.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.*/
async function getAllItemsModelUsingPG() {
  toDoItemsWinstonLogger.info(
    "Info log: Starting getItems, in itemsModelUsingPG."
  );
  let response = await performQueryReturnResult("select * from items");
  toDoItemsWinstonLogger.info(
    "Info log: Ending getItems, in itemsModelUsingPG."
  );
  return response;
}

/*Funciton to close pool can be exported and imported and called elsewhere*/
async function closingPoolInPGModel() {
  toDoItemsWinstonLogger.info(
    "Closing db connection pool, in itemsModelUsingPG."
  );
  if (pool != undefined) {
    try {
      await pool.end();
    } catch (err) {
      console.log(err);
    }
  }
  toDoItemsWinstonLogger.info(
    "Closed db connection pool, in itemsModelUsingPG."
  );
}

/*Adding an item to the to do list.*/
async function itemsAddUsingModelPG(item) {
  toDoItemsWinstonLogger.info(
    "Info log: starting adding an item, in itemsAddModel, in itemsModelUsingPG."
  );
  let response = await performQueryReturnResult(
    `insert into items (title) valuees('${item}')`
  );
  toDoItemsWinstonLogger.info(
    "Info log: ending adding an item, in itemsAddModel, in itemsModelUsingPG."
  );
  return response;
}

/*Updating an item on a to do list.*/
async function itemsEditUsingModelPG(updatedItemTitle, updatedItemId) {
  toDoItemsWinstonLogger.info(
    "Info log: starting editing an item in itemsModelUsingPG"
  );
  let response = performQueryReturnResult(
    `update items set title='${updatedItemTitle}' where id='${updatedItemId}'`
  );
  toDoItemsWinstonLogger.info(
    "Info log: ending editing an item, in itemsModelUsingPG"
  );
  return response;
}

/*Deleting an item on a to do list.*/
async function itemsDeleteUsingModelPG(deleteItemId) {
  toDoItemsWinstonLogger.info(
    "Info log: starting deleteing an item in itemsModelUsingPG"
  );
  let response = performQueryReturnResult(
    `delete from items where id=${deleteItemId}`
  );
  toDoItemsWinstonLogger.info(
    "Info log: ending deleteing an item in itemsModelUsingPG"
  );
  return response;
}

export {
  getAllItemsModelUsingPG,
  closingPoolInPGModel,
  itemsAddUsingModelPG,
  itemsEditUsingModelPG,
  itemsDeleteUsingModelPG,
};
