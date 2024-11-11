import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';  // Import uuidv4 to generate UUIDs
import { winstonLogger } from "../utils/winstonLogger.js";
import { Sequelize} from 'sequelize';

export default (sequelize, DataTypes) => {
  const items = sequelize.define('item', {
    itemId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
    },
    itemTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255], // Title must be between 1 and 255 characters
      },
    },
    userId: {
      type: DataTypes.UUID, // UUID for foreign key
      allowNull: true,
      references: {
        model: 'users', // Reference to the 'Users' table
        key: 'userId',      // Reference to the 'id' field of the Users table
      },
    },
  }, {
    timestamps: true,    // Enable createdAt and updatedAt
    paranoid: true,      // Enable soft deletes (deletedAt field will be set instead of deleting the record)
  });

  // Define associations
  items.associate = (models) => {
    // A user can have many items, and each item belongs to a user
    if (models.users==undefined)console.log("models.users is undef");
    items.belongsTo(models.user, {
      foreignKey: 'userId',
      onDelete: 'CASCADE', // Optional: If a user is deleted, all their items are deleted
      onUpdate: "CASCADE",
    });
  };

  return items;
};
