import winston from "winston";
import "../utils/winstonLogger.js";

import {
  getAllItemsModelUsingPG,
  closingPoolInPGModel,
  itemsAddUsingModelPG,
  itemsEditUsingModelPG,
  itemsDeleteUsingModelPG,
} from "../models/itemsModelUsingPG.js";

/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const toDoItemsWinstonLogger = winston.loggers.get("toDoItemsWinstonLogger");

/*Function to close pool can be exported and imported and called elsewhere*/
async function closingPoolInController() {
  toDoItemsWinstonLogger.info("Closing db connection pool, in controller.");
  try {
    const emp = await closingPoolInPGModel();
  } catch (err) {
    toDoItemsWinstonLogger.error(
      "Error closing db connection pool, in controller."
    );
  }
  toDoItemsWinstonLogger.info("Closed db connection pool, in controller.");
}

/*Getting all items on a to do list.
@param response: an array with 2 values, the data and any error generated. response[1] will be undefined for the second arg if there are no error.
*/
async function itemsGetAllController(req, res, next) {
  toDoItemsWinstonLogger.info(
    "Info log: starting fetching items, in toDoItemController."
  );
  req.messageInEventOfErrorDuringExecutionOfQuery = "Error while getting items";
  const response = await getAllItemsModelUsingPG();
  if (response[1] == undefined) {
    toDoItemsWinstonLogger.info(
      "Info log: There were no errors while fetching items, in toDoItemController."
    );
    res.send({ listTitle: "ARC To Do List", listItems: response[0] });
  } else
    res.send({
      listTitle: "ARC To Do List",
      listItems: response[0],
      error: "Fetching items failed.",
    });
  toDoItemsWinstonLogger.info(
    "Info log: ending fetching items in, in toDoItemController."
  );
}

/*Adding an item to the to do list.*/
async function itemsAddController(req, res, next) {
  toDoItemsWinstonLogger.info(
    "Info log: starting adding an item , in toDoItemController"
  );
  toDoItemsWinstonLogger.info("req.body:" + JSON.stringify(req.body));
  const item = req.body.newItem;
  if (item != undefined) {
    const response = await itemsAddUsingModelPG(item);
    if (response[1] == undefined) res.send({ message: "Success" });
    else res.send({ error: "There was an error adding a new item." });
    toDoItemsWinstonLogger.info(
      "Info log: ending adding an item, in toDoItemController"
    );
  } else {
    res.send({ error: "Your last operation encountered an error." });
    toDoItemsWinstonLogger.error(
      "Error log: there was no item sent to the server but the add method was called, in toDoItemController."
    );
  }
}

/*Updating an item on a to do list.*/
async function itemsEditController(req, res, next) {
  toDoItemsWinstonLogger.info(
    "Info log: starting editing an item in toDoItemController"
  );
  let updatedItemTitle = req.body.updatedItemTitle;
  let updatedItemId = req.body.updatedItemId;
  toDoItemsWinstonLogger.info(req.body);
  if (updatedItemId != undefined && updatedItemTitle != undefined) {
    let response = itemsEditUsingModelPG(updatedItemTitle, updatedItemId);
    if (response[1] == undefined) res.send({ message: "Success" });
    else res.send({ error: "There was an error editing a new item." });
    toDoItemsWinstonLogger.info(
      "Info log: ending editing an item, in toDoItemController"
    );
  } else {
    res.send({ error: "Your last operation encountered an error." });
    toDoItemsWinstonLogger.error(
      "Error log: either the item's ID or body were missing, but the edit method was called, in toDoItemController."
    );
  }
}

/*Deleting an item on a to do list.*/
async function itemsDeleteController(req, res, next) {
  toDoItemsWinstonLogger.info(
    "Info log: starting deleteing an item in toDoItemController"
  );
  toDoItemsWinstonLogger.info(
    "Info log: req.body.data.deleteItemId:" + req.body.deleteItemId
  );
  let deleteItemId = parseInt(req.body.deleteItemId);
  if (deleteItemId != undefined) {
    let response = itemsDeleteUsingModelPG(deleteItemId);
    if (response[1] == undefined) res.send({ message: "Success" });
    else res.send({ error: "There was an error editing a new item." });
    toDoItemsWinstonLogger.info(
      "Info log: ending deleteing an item in toDoItemController"
    );
  } else {
    res.send({ error: "Your last operation encountered an error." });
    toDoItemsWinstonLogger.error(
      "Error log: there was no id sent to the server but the delete method was called, toDoItemController."
    );
  }
}

export {
  closingPoolInController,
  itemsGetAllController,
  itemsAddController,
  itemsEditController,
  itemsDeleteController,
};
