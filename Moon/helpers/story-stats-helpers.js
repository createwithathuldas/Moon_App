const { connectToDatabase } = require('../config/connection');
var collection=require('../config/collections');
const { ObjectId } = require('mongodb');
const { addStory } = require('./story-helpers');
const { initialize } = require('passport');

module.exports = {
    addStoryStats: async (storyStats, callback) => {
        try {
            console.log(storyStats);
            const db = await connectToDatabase(); // Get the database connection
            const result = await db.collection('storystats').insertOne(storyStats); // Insert the story
            console.log(result.insertedId); // Log the inserted ID for debugging
            callback(result.insertedId);
        } catch (err) {
            console.error('Failed to add story stats', err);
            callback(false); // Callback with failure
        }
    } ,
    initializeComments: async (storyId, userId) => {
        try {
            const db = await connectToDatabase();
            const existingComment = await db.collection('comments').findOne({
                storyId: new ObjectId(storyId),
                userId: new ObjectId(userId),
            });
    
            if (existingComment) {
                console.log("Found existing comment ID:", existingComment._id);
                return existingComment._id.toString(); // Ensure it's a string
            } else {
                const commentInitializer = {
                    storyId: new ObjectId(storyId),
                    userId: new ObjectId(userId),
                    comments: [],
                    like: false,
                };
                const result = await db.collection('comments').insertOne(commentInitializer);
                console.log("Created new comment ID:", result.insertedId);
                return result.insertedId.toString(); // Ensure it's a string
            }
        } catch (error) {
            console.error("Error in initializeComments:", error);
            throw error; // Re-throw to handle in the route
        }
    },
    addRemoveLike: async (storyId, userId, likeState) => {
      try {
        const db = await connectToDatabase();
        console.log("Story helpers side story id: " + storyId);
        console.log("Story helpers side user id: " + userId);
    
        // Normalize likeState to a boolean value (in case it's a string 'true' or 'false')
        likeState = likeState === 'true' || likeState === true;
        console.log("Normalized like state: ", likeState);  // Log the normalized boolean value
    
        const story = await db.collection('storystats').findOne({ storyId: new ObjectId(storyId) });
        
        if (!story) {
          throw new Error("Story not found");
        }
    
        // Log the update operation for debugging
        const updateOperation = likeState
          ? { $inc: { likes: 1 } }
          : { $inc: { likes: -1 } };
        console.log("Update operation: ", updateOperation);  // Log update operation before executing
    
        const result = await db.collection('storystats').updateOne(
          { storyId: new ObjectId(storyId) },  // Ensure the storyId is correctly converted to ObjectId
          updateOperation
        );
        const commentResult = await db.collection('comments').updateOne(
          { storyId: new ObjectId(storyId), userId: new ObjectId(userId) },
          { $set: { like: likeState } }
        );
        console.log("Comment result: ", commentResult);  // Log the result of the comment update operation
        console.log("Result of like count update: ", result);  // Log the result of the like count update operation

        return result;
      } catch (error) {
        console.error("Error updating like count:", error);
        throw error;
      }
    },
    getComments: async (storyId) => {
        try {
            const db = await connectToDatabase();
            const comments = await db.collection('comments').find({ storyId: new ObjectId(storyId) }).toArray();
           if (comments.length > 0) {
                console.log(comments); // Log the comments for debugging
                return comments;
            } else {
                return []; // Return an empty array if no comments are found
            }
        } catch (error) {
            console.error("Error getting comments:", error);
            throw error;
        }
    },
    getStoryStats: async (storyId) => {
        try {
            const db = await connectToDatabase();
            const storyStats = await db.collection('storystats').findOne({ storyId: new ObjectId(storyId) });
            if (storyStats) {
                console.log(storyStats); // Log the story stats for debugging
                return storyStats;
            } else {
                return null; // Return null if no story stats are found
            }
        } catch (error) {
            console.error("Error getting story stats:", error);
            throw error;
        }
    } ,
    addComment: async (storyId, userId, comment) => {
        try {
          // Convert storyId and userId to ObjectId before using in query
          const storyObjectId = new ObjectId(storyId);
          const userObjectId = new ObjectId(userId);
      
          const db = await connectToDatabase();
          const result = await db.collection('comments').updateOne(
            { storyId: storyObjectId, userId: userObjectId }, // Use ObjectId
            { $push: { comments: comment } }
          );
          
          console.log(result); // Log the result for debugging
          return result;
        } catch (error) {
          console.error("Error adding comment:", error);
          throw error;
        }
      },
      // Helper function to empty comments array
      deleteComment: async (commentId) => {
        try {
            console.log("Inside delete comment");
            console.log(commentId);
    
            // Check if the commentId is a valid ObjectId
            if (!ObjectId.isValid(commentId)) {
                throw new Error("Invalid commentId format");
            }
    
            const db = await connectToDatabase();
            const result = await db.collection('comments').updateOne(
                { _id: new ObjectId(commentId) },
                { $set: { comments: [] } }, // This empties the comments array
                { new: true } );
    
            // Log the result to ensure the delete was successful
            if (result.deletedCount === 1) {
                console.log("Comment has been deleted.");
            } else {
                console.log("No document was deleted.");
            }
    
            return result;
        } catch (error) {
            console.error("Error deleting comment:", error);
            throw error;
        }
    },
    
    
    
    
      
    

};