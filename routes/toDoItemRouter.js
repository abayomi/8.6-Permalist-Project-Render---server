import express from "express";
import winston from "winston";
import "../utils/winstonLogger.js";
import {
  tryCatchAsyncController,
  checkIsNotUndefined,
} from "../utils/tryCatch-checkUndefined.js";

import {
  closingPoolInController,
  itemsGetAllController,
  itemsAddController,
  itemsEditController,
  itemsDeleteController,
} from "../controllers/toDoItemController.js";

/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const toDoItemsWinstonLogger = winston.loggers.get("toDoItemsWinstonLogger");
toDoItemsWinstonLogger.info("Start of variable definition.");
const toDoItemRouter = express.Router();
toDoItemsWinstonLogger.info("End of variable definition.");

//To test errors are caught by server
// setTimeout(() => {
//   throw new Error("test uncaughtException");
// }, 10000);
// throw new Error("test uncaughtException");

/*Funciton to close pool can be exported and imported and called elsewhere*/
async function closingPool() {
  toDoItemsWinstonLogger.info("Closing db connection pool, in router.");
  try {
    const emp = await closingPoolInController();
  } catch (err) {
    toDoItemsWinstonLogger.error(
      "Error log: pool can't close, in toDoItemRouter"
    );
  }
  toDoItemsWinstonLogger.info("Closed db connection pool, in router.");
}

/*Getting all items on a to do list.*/
toDoItemRouter.get("/", tryCatchAsyncController(itemsGetAllController));

/*Adding an item to the to do list.*/
toDoItemRouter.post("/add", tryCatchAsyncController(itemsAddController));

/*Updating an item on a to do list.*/
toDoItemRouter.patch("/edit", tryCatchAsyncController(itemsEditController));

/*Deleting an item on a to do list.*/
toDoItemRouter.delete(
  "/delete",
  tryCatchAsyncController(itemsDeleteController)
);

//To test unhandled rejections are accomodated for
// const p = new Promise((_, reject) => {
//   reject(new Error("This is a test unhandled rejection!"));
// });

export { toDoItemRouter, closingPool };
