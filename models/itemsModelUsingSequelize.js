import Sequelize from "sequelize";
import winston from "winston";
import "../utils/winstonLogger.js";
import env from "dotenv";
import zlib from "zlib";

env.config();
const toDoItemsWinstonLogger = winston.loggers.get("toDoItemsWinstonLogger");
toDoItemsWinstonLogger.info(
  "Start of variable definition, in itemsModelUsingSequelize."
);
let items;
let users;
/*The sql technique used in this code is model methods. The prevent sql injection because they parameterize the query and user replacment to insert the data. So if you print out the query you will see the data inserted and escaped. Even though this isnt't as secure as bind parameters which are never inserted into the query at all, so if you print out the query you won't see them. Bind parameters are escaped and used at execution time only and are passed to the database engine seperately from the query itself which escapes them and uses them where they are needed. So they are more secure than replacements.*/
const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.USER,
  process.env.PASSWORD,
  {
    dialect: "postgres",
    host: process.env.HOST,
    port: process.env.DB_PORT,
    dialectOptions: { ssl: { require: true } },
  }
);
toDoItemsWinstonLogger.info(
  "End of variable definition, in itemsModelUsingSequelize."
);

toDoItemsWinstonLogger.info(
  "Start authenticate sequelize, in itemsModelUsingSequelize."
);
/*Authenticate returns a promise. This steps does not need to be done, but it is a good practice to ensure you can connected before you continue with your code.
 */
async function testConnection() {
  try {
    // Await the authenticate() method to check the connection
    await sequelize.authenticate();
    toDoItemsWinstonLogger.info(
      "Sequelize connection has been established successfully in itemsModelUsingSequelize."
    );
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Unable to connect to the database: in itemsModelUsingSequelize. error name: " +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
  }
  toDoItemsWinstonLogger.info(
    "End authenticate sequelize, in itemsModelUsingSequelize."
  );
}

/* Defining the object relational model.
item is The name of the model. This will be used to reference the model in queries and associations. It is automatically capitaized by sequelize to form that table name by a library called inflection that comes along with sequelize. define can take a third parameter to prevent the model name from being pluralized to form the model name.
Even though timestamp:true, is the default, it is put in the list of third options below for the sake of being explicit.
*/
function defineORM() {
  items = sequelize.define(
    "item",
    {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        paranoid: true, //paranoid tables have rows that are not actually deleted but marked with a deleteion timestamp in a column. Model queries ignore these reows but raw queries do not. The restore method removes the deleted timestamp. Use paranoid:false to include soft deleted records.
        validate: { len: [1, 255] },
        set(value) {
          //deflateSync will compress the data taking different types of parameers as input. In this case it takes a string as input. The output of deflateSync is a buffer and we want a string to so we call toString and want to use base64 which is a type of encoding that turns inary data into text. setters and getters cannot take asynchronous functions so deflateSync is used.
          //The string value passed into deflateSync is encoded into a binary array using utf-8. deflateSync creates a new buffer of binary data some of which might not map to valid utf-8 characters. That is why base64 is used to convert that new binary data into a string as base64 is equipped to convert all binary data to text.
          const compressed = zlib.deflateSync(value).toString("base64");
          this.setDataValue("title", compressed);
        },
        get() {
          const value = this.getDataValue("title");
          //inflateSync will uncompress that data and takes a buffer as the argument. This buffer is created using the description stored in our database and using the buffer.from method which creates a buffer from the first argument to be passed and the second argument is the encoding method.base64 is typically used for binary data. inflateSync returns a buffer object so toString converts it to a string.
          //base64 is used to convert the string in the database to a buffer of binary data and then zlib restores it to the original binrary array that was given to deflateSync. the toString method uses utf-8 to convert the binrary data into a the original string.
          const uncompressed = zlib.inflateSync(Buffer.from(value, "base64"));
          return uncompressed.toString();
        },
      },
    },
    { timestamp: true }
  );
}

function defineORMUsers() {
  users = sequelize.define(
    "user",
    {
      userid: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        paranoid: true,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        paranoid: true,
        unique: false,
        set(value) {
          const salt = bcrypt.genSaltSync(12);
          const hash = bcrypt.hashSync(value, salt);
          this.setDataValue("password", hash);
        },
      },
    },
    { timestamp: true }
  );
}

function defineAssociations() {
  items.belongsTo(users, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    foreignKey: { name: "userid", allowNull: true },
  });
  users.hasMany(items, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    foreignKey: { name: "userid", allowNull: true },
  });
}

/*Using model synchronoization to add the table to our database if it does not already exist.
alter true, will update the table to match the schema. It will not change the column datatype of varchar(255) to match the schema datatype of string, as it considers that these already match.
*/
async function createAlterTable() {
  try {
    // Test the connection to the database
    await items.sync({ alter: true });
    toDoItemsWinstonLogger.info(
      "Sync was successful, in itemsModelUsingSequelize."
    );
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Sync was unsuccessful, in itemsModelUsingSequelize." +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
  }
}
/*Instead of using the functions 'build' and 'save', you can use the methods 'create' and 'bulkCreate'.
@return: return an array with 2 values, the data and any error generated. In general this function will always return undefined for the second arg as it has no errors.*/
async function itemsAddUsingModelSequelize(title) {
  toDoItemsWinstonLogger.info(
    "Building a new row instance, in itemsModelUsingSequelize."
  );
  try {
    const itemToAdd = items.build({ title: title });
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
      { title: updatedItemTitle },
      { where: { id: updatedItemId } }
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
    "Updating a row instance, in itemsModelUsingSequelize."
  );
  try {
    const result = await items.destroy({ where: { id: deleteItemId } });
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

/*Funciton to close sequelize can be exported and imported and called elsewhere*/
async function closingPoolInSequelizeModel() {
  toDoItemsWinstonLogger.info(
    "Closing Sequelize connection pool, in itemsModelUsingSequelize."
  );
  if (sequelize != undefined) {
    try {
      await sequelize.close();
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

await testConnection();
defineORM();
//defineORMUsers();
//defineAssociations();
await createAlterTable();
//await itemsAddUsingModelSequelize("delicious");
await getAllItemsModelUsingSequelize();

export {
  closingPoolInSequelizeModel,
  itemsAddUsingModelSequelize,
  getAllItemsModelUsingSequelize,
  itemsEditUsingModelSequelize,
  itemsDeleteUsingModelSequelize,
};
