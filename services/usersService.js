// services/userService.js
import models from '../models/index.js';  // Import models
import { winstonLogger } from "../utils/winstonLogger.js";

const toDoItemsWinstonLogger = winstonLogger;
const users=models.users;
// Service to create a new user
export const createUser = async (userData) => {
  try {
    const { username, email } = userData;

    // Create a new user
    const newUser = await User.create({
      username,
      email,
    });

    return newUser;
  } catch (error) {
    throw error;
  }
};

// Service to get a user by ID
export const getUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      include: { model: Item },  // Include items associated with the user
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw error;
  }
};
