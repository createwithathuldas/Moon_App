const { connectToDatabase } = require('../config/connection');
var collection=require('../config/collections');
const { ObjectId } = require('mongodb');
const { use } = require('passport');

module.exports = {
    registerUser :async (user, callback) => {
        try {
            console.log(user);
            const db = await connectToDatabase(); // Get the database connection
            const result = await db.collection('users').insertOne(user); // Insert the story
            console.log(result.insertedId); // Log the inserted ID for debugging
            callback(result.insertedId);
        } catch (err) {
            console.error('Failed to add user', err);
            callback(false); // Callback with failure
        }
    } ,
    checkUserExists: async (email) => {
        const db = await connectToDatabase();
        const user = await db.collection('users').findOne({ email: email });
        return !!user; // Returns true if user exists
      } ,
    verifyUser: async (email, password) => {
        const db = await connectToDatabase();
        const user = await db.collection('users').findOne({ email: email });
        if (!user) {
          return false; // User not found
        }
        console.log(user);
        return user.password === password ? user : false; // Return the user if password matches
      } ,
    getUser: async (userId) => {
          try {
              const db = await connectToDatabase();
              
              // Validate userId format (optional)
              if (!ObjectId.isValid(userId)) {
                  throw new Error("Invalid user ID format");
              }
      
              const user = await db.collection('users').findOne({ 
                  _id: new ObjectId(userId) 
              });
      
              if (!user) {
                  console.log("No user found with ID:", userId);
                  return null;
              }
              return user;
          } catch (error) {
              console.error("Error fetching user:", error);
              throw error; // Or return null
          }
      } ,
      updateUser: async (userId, userData) => {
        try {
          // Check if the userId is a valid ObjectId format (24-character hex string)
          if (!ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
          }
    
          // Convert userId to ObjectId if valid
          const objectId = new ObjectId(userId);
          
          const db = await connectToDatabase();
          const result = await db.collection('users').updateOne(
            { _id: objectId },
            { $set: userData }
          );
    
          return result.modifiedCount > 0; // Return true if the user was updated
        } catch (err) {
          console.error('Error updating user:', err);
          throw err; // Rethrow the error to be handled by the caller
        }
      } ,
      deleteUser: async (userId) => {
        try {
          // Check if the userId is a valid ObjectId format (24-character hex string)
          if (!ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
          }
    
          // Convert userId to ObjectId if valid
          const objectId = new ObjectId(userId);
    
          const db = await connectToDatabase();
          const result = await db.collection('users').deleteOne({ _id: objectId });
    
          return result.deletedCount > 0; // Return true if the user was deleted
        } catch (err) {
          console.error('Error deleting user:', err);
          throw err; // Rethrow the error to be handled by the caller
        }
      } ,
      changePassword: async (userId, currentPassword, newPassword) => {
        try {
          // Check if the userId is a valid ObjectId format (24-character hex string)
          if (!ObjectId.isValid(userId)) {
            return { success: false, message: 'Invalid user ID format' };
          }
      
          // Convert userId to ObjectId if valid
          const objectId = new ObjectId(userId);
      
          const db = await connectToDatabase();
          const user = await db.collection('users').findOne({ _id: objectId });
      
          if (!user) {
            return { success: false, message: 'User not found' };
          }
      
          if (user.password !== currentPassword) {
            return { success: false, message: 'Current password is incorrect' };
          }
      
          const result = await db.collection('users').updateOne(
            { _id: objectId },
            { $set: { password: newPassword } }
          );
      
          return result.modifiedCount > 0 
            ? { success: true, message: 'Password updated successfully' } 
            : { success: false, message: 'Failed to update password' };
        } catch (err) {
          console.error('Error changing password:', err);
          return { success: false, message: 'An error occurred while changing the password' };
        }
      }
           
}