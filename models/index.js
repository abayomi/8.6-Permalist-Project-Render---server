import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';
import { winstonLogger } from "../utils/winstonLogger.js";
import env from "dotenv";

const toDoItemsWinstonLogger = winstonLogger;
// Get the current module's directory using import.meta.url
const currentPath = new URL(import.meta.url).pathname;
// On Windows, `pathname` starts with a `/` after the drive letter (e.g., `file:///D:/...`), so we need to remove the leading `/`.
const __dirname = path.dirname(currentPath).replace(/^\/([a-zA-Z]:)/, '$1');  // Fix for Windows paths
console.log("__dirname:"+__dirname);

//load the .env depending on the NODE_ENV
if (process.env.NODE_ENV == "development") {
  env.config();
} else env.config({ path: `.env.${process.env.NODE_ENV}` });

// 1. Function to initialize Sequelize instance
const initSequelize = () => {
  return new Sequelize(
    process.env.DATABASE,
    process.env.USER,
    process.env.PASSWORD,
    {
      dialect: "postgres",
      host: process.env.HOST,
      port: process.env.DB_PORT,
      dialectOptions: { ssl: { require: true } },
    });
};

/*Authenticate returns a promise. This steps does not need to be done, but it is a good practice to ensure you can connected before you continue with your code.
 */
async function testConnection(sequelize) {
  try {
    // Await the authenticate() method to check the connection
    await sequelize.authenticate();
    toDoItemsWinstonLogger.info(
      "Sequelize connection has been established successfully in models index.js."
    );
  } catch (error) {
    toDoItemsWinstonLogger.error(
      "Unable to connect to the database: in models index.js. error name: " +
        error.name +
        ". error message: " +
        error.message +
        ". error stack: " +
        error.stack
    );
  }
  toDoItemsWinstonLogger.info(
    "End authenticate sequelize, in models index.js."
  );
}

// 2. Function to dynamically load all models
const loadModels = async (sequelize) => {
  const models = {};
  
  // Get all files in the current directory excluding `index.js`
  console.log("__dirname in loadModels:"+__dirname);
  const modelFiles = fs.readdirSync(__dirname).filter(file => file !== 'index.js');
  // Convert __dirname to a file:// URL scheme
  const dirUrl = new URL(`file://${__dirname}/`); // Add trailing slash for directory URL

  // Dynamically import and initialize each model
  for (const file of modelFiles) {
    const modelPath = new URL(file, dirUrl); 
    const { default: modelDefiner } = await import(modelPath);  // Dynamic import
    const model = modelDefiner(sequelize, DataTypes);  // Initialize model with Sequelize instance
    models[model.name] = model;  // Store model by its name
  }

  return models;
};

// 3. Function to setup associations between models
const setupAssociations = (models) => {
  Object.values(models).forEach(model => {
    if (model.associate) {
      model.associate(models);  // Call associate method if defined
    }
  });
};

// 4. Main function to initialize Sequelize, load models, and setup associations
const initModels = async () => {
  const sequelize = initSequelize();  // Initialize Sequelize connection
  await testConnection(sequelize);
  const models = await loadModels(sequelize);  // Load all models

  setupAssociations(models);  // Set up associations between models

  // Attach Sequelize instance and Sequelize library to the models object
  models.sequelize = sequelize;
  models.Sequelize = Sequelize;

  return models;  // Return all models with Sequelize instance attached
};

// 5. Run the initialization and export the models
const models = await initModels();
export default models;  // Export models to be used globally in the app

