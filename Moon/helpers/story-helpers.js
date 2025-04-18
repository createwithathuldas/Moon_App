// story-helpers.js
const { connectToDatabase } = require('../config/connection');
var collection=require('../config/collections');
const { ObjectId } = require('mongodb');

module.exports = {
    addStory: async (story, callback) => {
        try {
            console.log(story);
            const db = await connectToDatabase(); // Get the database connection
            const result = await db.collection('stories').insertOne(story); // Insert the story
            console.log(result.insertedId); // Log the inserted ID for debugging
            callback(result.insertedId);
        } catch (err) {
            console.error('Failed to add story', err);
            callback(false); // Callback with failure
        }
    } ,
    getAllStories: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await connectToDatabase(); // Get the database connection
                const stories = await db.collection(collection.STORY_COLLECTION).find().toArray(); // Fetch all stories
                resolve(stories); // Resolve with the fetched stories
            } catch (err) {
                console.error('Failed to fetch stories', err);
                reject(err); // Reject with the error
            }
        });
    },
    deleteStory: async (storyId) => {
        try {
            const db = await connectToDatabase(); // Get the database connection
            const result = await db.collection(collection.STORY_COLLECTION).deleteOne({ _id: new ObjectId(storyId) }); // Convert storyId to ObjectId
            return result.deletedCount > 0; // Return true if a story was deleted
        } catch (err) {
            console.error('Failed to delete story', err);
            return false; // Return false if there was an error
        }
    },
    updateStory: async (storyId, storyUpdates, callback) => {
        try {
            console.log(storyId, storyUpdates); // Log the storyId and updates for debugging
            const db = await connectToDatabase(); // Get the database connection
    
            // Convert storyId to ObjectId
            const objectId = new ObjectId(storyId);
    
            // Remove _id from storyUpdates to avoid modifying the immutable field
            delete storyUpdates._id;
    
            // Perform the update operation
            const result = await db.collection('stories').updateOne(
                { _id: objectId }, // Find the story by its unique ID (now as ObjectId)
                { $set: storyUpdates } // Update the fields in the story with the new data
            );
    
            // if (result.modifiedCount > 0) {
            //     console.log(`Story with ID ${storyId} updated successfully.`);
                 callback(true); // Callback with success
            // } else {
            //     console.log(`No changes were made to story with ID ${storyId}.`);
            //     callback(false); // Callback with failure if no document was updated
            // }
        } catch (err) {
            console.error('Failed to update story', err);
            callback(false, err); // Pass the error to the callback
        }
    },
    getOneStory: async (currentStoryId) => {
        try {
            // Validate ID format first
            if (!ObjectId.isValid(currentStoryId)) {
                throw new Error('Invalid story ID format');
            }
    
            const db = await connectToDatabase();
            const story = await db
                .collection(collection.STORY_COLLECTION)
                .findOne({ _id: new ObjectId(currentStoryId) });
    
            if (!story) {
                console.warn(`No story found with ID: ${currentStoryId}`);
                return null; // or throw an error depending on your needs
            }
            return story;
        } catch (error) {
            console.error('Error fetching story:', error);
            throw error; // or return null
        }
    }
    
};