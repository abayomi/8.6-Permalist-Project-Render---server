// services/itemService.js
import models from '../models/index.js';  // Import models
import { winstonLogger } from "../utils/winstonLogger.js";

const items=models.item;
const users=models.user;
const toDoItemsWinstonLogger = winstonLogger;

// Service to create a new item for a user
async function createItemForUser(itemData) {
  try {
    const { itemTitle, userId } = itemData;
    
    // Check if the user exists
    const user = await users.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create a new item and associate it with the user
    const newItem = await items.create({
      itemTitle,
      userId
    });

    return newItem;
  } catch (error) {
    throw error;
  }
};

// Service to get all items for a specific user
async function getItemsByUser(userId){
  try {
    // Find the user by primary key (id)
    const user = await users.findByPk(userId, {
      include: { model: items },  // Include the items associated with this user
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.Items;  // Returns an array of items for the user
  } catch (error) {
    throw error;
  }
};

// Service to delete an item
async function deleteItem(itemId){
  try {
    const item = await items.findByPk(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    await item.destroy();
    return { message: 'Item successfully deleted' };
  } catch (error) {
    throw error;
  }
};

/*Funciton to close sequelize can be exported and imported and called elsewhere*/
async function closingPoolInSequelizeService() {
  toDoItemsWinstonLogger.info(
    "Closing Sequelize connection pool, in itemsModelUsingSequelize."
  );
  if (sequelize != undefined) {
    try {
      await models.sequelize.close();
    } catch (error) {
      toDoItemsWinstonLogger.error(
        "Sequelize close was unsuccessful, in itemsModelUsingSequelize." +
          error.name +
          ". error message: " +
          error.message +
          ". error stack: " +
          error.stack
      );
    }
  }
  toDoItemsWinstonLogger.info(
    "Closed Sequelize connection pool, in itemsModelUsingSequelize."
  );
}

/*Instead of using the functions 'build' and 'save', you can use the methods 'create' and 'bulkCreate'.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.*/
async function itemsAddUsingModelSequelize(title) {
  toDoItemsWinstonLogger.info(
    `Building a new row instance with ${title}, in itemsModelUsingSequelize.`
  );
  try {
    const itemToAdd = items.build({ itemTitle: title });
    const validationResult = await itemToAdd.validate(); //Will run the ORM validation on the data before it is attempted to save it to the database.
    //if validation fails, it will throw an error that will be caught in the catch block below.
    toDoItemsWinstonLogger.info(
      "Committing a new row instance, in itemsModelUsingSequelize."
    );
    const result = await itemToAdd.save();
    toDoItemsWinstonLogger.info(
      "Committed a new row instance, in itemsModelUsingSequelize."
    );
    return [result.toJSON(), undefined];
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Sync was unsuccessful, in itemsModelUsingSequelize." +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
    return [undefined, error];
  }
}

/*Updating an item on a to do list.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.*/
async function itemsEditUsingModelSequelize(updatedItemTitle, updatedItemId) {
  toDoItemsWinstonLogger.info(
    "Updating a row instance, in itemsModelUsingSequelize."
  );
  try {
    const result = await items.update(
      { itemTitle: updatedItemTitle },
      { where: { itemId: updatedItemId } }
    );
    toDoItemsWinstonLogger.info(
      "Committed an updated row instance, in itemsModelUsingSequelize."
    );
    return [result, undefined];
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Sync was unsuccessful, in itemsModelUsingSequelize." +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
    return [undefined, error];
  }
}

/*Deleting an item on a to do list.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.*/
async function itemsDeleteUsingModelSequelize(deleteItemId) {
  toDoItemsWinstonLogger.info(
    `Deleting a row instance, with id ${deleteItemId}, in itemsModelUsingSequelize.`
  );
  try {
    const result = await items.destroy({ where: { itemId: deleteItemId } });
    toDoItemsWinstonLogger.info(
      "Committed an updated row instance, in itemsModelUsingSequelize."
    );
    return [result, undefined];
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Sync was unsuccessful, in itemsModelUsingSequelize." +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
    return [undefined, error];
  }
}

/*Getting items from database.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.
Instead of using toJSON method on the returned object, we could use raw:true on the query to get the same result.*/
async function getAllItemsModelUsingSequelize() {
  toDoItemsWinstonLogger.info(
    "Info log: Starting getItems, in itemsModelUsingSequelize."
  );
  try {
    let response = await items.findAll({ order: [["createdAt", "DESC"]] }); //ASC
    toDoItemsWinstonLogger.info(
      "Info log: Ending getItems, in itemsModelUsingSequelize."
    );
    const parsedResponse = response.map((ele) => {
      return ele.toJSON();
    });
    return [parsedResponse, undefined];
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Sync was unsuccessful, in itemsModelUsingSequelize." +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
    return [undefined, error];
  }
}

export {
  closingPoolInSequelizeService,
  itemsAddUsingModelSequelize,
  getAllItemsModelUsingSequelize,
  itemsEditUsingModelSequelize,
  itemsDeleteUsingModelSequelize,
};