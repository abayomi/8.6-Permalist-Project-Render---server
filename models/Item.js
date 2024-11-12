import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';  // Import uuidv4 to generate UUIDs
import { winstonLogger } from "../utils/winstonLogger.js";
import { Sequelize} from 'sequelize';
import zlib from "zlib";

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
      set(value) {
        //deflateSync will compress the data taking different types of parameers as input. In this case it takes a string as input. The output of deflateSync is a buffer and we want a string to so we call toString and want to use base64 which is a type of encoding that turns inary data into text. setters and getters cannot take asynchronous functions so deflateSync is used.
        //The string value passed into deflateSync is encoded into a binary array using utf-8. deflateSync creates a new buffer of binary data some of which might not map to valid utf-8 characters. That is why base64 is used to convert that new binary data into a string as base64 is equipped to convert all binary data to text.
        const compressed = zlib.deflateSync(value).toString("base64");
        this.setDataValue("itemTitle", compressed);
      },
      get() {
        const value = this.getDataValue("itemTitle");
        //inflateSync will uncompress that data and takes a buffer as the argument. This buffer is created using the description stored in our database and using the buffer.from method which creates a buffer from the first argument to be passed and the second argument is the encoding method.base64 is typically used for binary data. inflateSync returns a buffer object so toString converts it to a string.
        //base64 is used to convert the string in the database to a buffer of binary data and then zlib restores it to the original binrary array that was given to deflateSync. the toString method uses utf-8 to convert the binrary data into a the original string.
        const uncompressed = zlib.inflateSync(Buffer.from(value, "base64"));
        return uncompressed.toString();
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
