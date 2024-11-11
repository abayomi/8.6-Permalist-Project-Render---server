import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';  // Import uuidv4 to generate UUIDs
import { Sequelize} from 'sequelize';

export default (sequelize, DataTypes) => {
  const users = sequelize.define('user', {
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4, // Automatically generates a UUIDv4
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    userEmailVerifiedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    userPassword: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    userPasswordResetToken: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
      unique: false,
    },
    userSalt: {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
      unique: false,
    },
  }, {
    timestamps: true,  // Automatically create createdAt and updatedAt fields
    paranoid: true,
  });

  // Define associations
  users.associate = (models) => {
    // A user can have many items (one-to-many relationship)
    users.hasMany(models.item, {
      foreignKey: 'userId', // The foreign key in the Item model that references the User's id
      onDelete: 'CASCADE',   // When a User is deleted, all their Items are deleted
      onUpdate: 'CASCADE',
    });
  };
  return users;
};
