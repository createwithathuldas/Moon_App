const { connectToDatabase } = require('../config/connection');
var collection=require('../config/collections');
const { ObjectId } = require('mongodb');
const { use } = require('passport');
const { changePassword } = require('./user-helper');

module.exports = {
    verifyAdmin: async (email, password) => {
        const db = await connectToDatabase();
        const admin = await db.collection('admin').findOne({ email: email });
        if (!admin) {
          return false; // Admin not found
        }
        console.log(admin);
        return admin.password === password ? admin : false; // Return the admin if password matches
      } ,
    getAdmin: async (adminId) => {
          try {
              const db = await connectToDatabase();
              
              // Validate adminId format (optional)
              if (!ObjectId.isValid(adminId)) {
                  throw new Error("Invalid admin ID format");
              }
      
              const admin = await db.collection('admin').findOne({ 
                  _id: new ObjectId(adminId) 
              });
      
              if (!admin) {
                  console.log("No admin found with ID:", adminId);
                  return null;
              }
              return admin;
          } catch (error) {
              console.error("Error fetching admin:", error);
              throw error; // Or return null
          }
      } ,
      updateAdmin: async (adminId, adminData) => {
        try {
          if (!ObjectId.isValid(adminId)) {
            throw new Error('Invalid admin ID format');
          }
      
          const db = await connectToDatabase();
          const result = await db.collection('admin').updateOne(
            { _id: new ObjectId(adminId) },
            { $set: adminData }
          );
      
          // Return true only if document was actually found and updated
          return result.matchedCount > 0 && result.modifiedCount > 0;
        } catch (error) {
          console.error('Error updating admin:', error);
          throw error; // Re-throw to handle in the route
        }
      } ,
      getAllAdmins: async () => {
        try {
          const db = await connectToDatabase();
          const admins = await db.collection('admin').find().toArray();
          return admins;
        } catch (error) {
          console.error('Error fetching admins:', error);
          return [];
        }
      } ,
      deleteAdmin: async (adminId) => {
        const db = await connectToDatabase();
        const result = await db.collection('admin').deleteOne({ 
          _id: new ObjectId(adminId) 
        });
        return result.deletedCount === 1;
      } ,
      addAdmin: async (adminData) => {
        try {
          const db = await connectToDatabase();
          const result = await db.collection('admin').insertOne(adminData);
      
          if (result.insertedCount === 0) {
            console.log('Failed to add admin');
            return false;
          }
      
          console.log('Admin added successfully');
          return true;
        } catch (error) {
          console.error('Error adding admin:', error);
          return false;
        }
      } ,
      getAdminByEmail: async (email) => {
        try {
          const db = await connectToDatabase();
          const admin = await db.collection('admin').findOne({ email: email });
          return admin;
        } catch (error) {
          console.error('Error fetching admin by email:', error);
          return null;
        }
      } ,
      changePassword: async (adminId, currentPassword, newPassword) => {
        try {
          const db = await connectToDatabase();
          const admin = await db.collection('admin').findOne({ 
            _id: new ObjectId(adminId) 
          });
      
          if (!admin) {
            return { success: false, message: 'Admin not found' };
          }
      
          if (admin.password !== currentPassword) {
            return { success: false, message: 'Current password is incorrect' };
          }
      
          const result = await db.collection('admin').updateOne(
            { _id: new ObjectId(adminId) },
            { $set: { password: newPassword } }
          );
      
          return result.modifiedCount > 0
            ? { success: true }
            : { success: false, message: 'Failed to update password' };
        } catch (error) {
          console.error('Error changing password:', error);
          return { success: false, message: 'An error occurred' };
        }
      },
      getDashboardData: async () => {
        try {
            const db = await connectToDatabase();
            
            // Basic counts
            const totalUsers = await db.collection('users').countDocuments();
            const totalStories = await db.collection('stories').countDocuments();
            const totalAdmins = await db.collection('admin').countDocuments();
            
            // Get all story stats
            const storyStats = await db.collection('storystats').find().toArray();
            
            // Calculate average listening time
            const totalListeningTime = storyStats.reduce((sum, stat) => sum + (stat.listeningTime || 0), 0);
            const averageListeningTime = storyStats.length > 0 ? totalListeningTime / storyStats.length : 0;
            
            // Find most popular story (by listen count)
            const storyListenCounts = {};
            storyStats.forEach(stat => {
                if (stat.storyId) {
                    storyListenCounts[stat.storyId] = (storyListenCounts[stat.storyId] || 0) + 1;
                }
            });
            
            let mostPopularStoryId = null;
            let maxListens = 0;
            for (const [storyId, count] of Object.entries(storyListenCounts)) {
                if (count > maxListens) {
                    mostPopularStoryId = storyId;
                    maxListens = count;
                }
            }
            
            // Get details of the most popular story
            let mostPopularStory = null;
            if (mostPopularStoryId) {
                mostPopularStory = await db.collection('stories').findOne({ _id: mostPopularStoryId });
            }
            
            // Get story listening counts (subcollections)
            const storiesWithListenCounts = await db.collection('stories').aggregate([
                {
                    $lookup: {
                        from: "storystats",
                        localField: "_id",
                        foreignField: "storyId",
                        as: "stats"
                    }
                },
                {
                    $project: {
                        title: 1,
                        listenCount: { $size: "$stats" }
                    }
                }
            ]).toArray();
            
            // Get user creation dates and ages
            const users = await db.collection('users').find(
                {},
                { projection: { createdAt: 1, age: 1 } }
            ).toArray();
            
            return {
                totalUsers,
                totalStories,
                totalAdmins,
                averageListeningTime,
                mostPopularStory: mostPopularStory ? {
                    _id: mostPopularStory._id,
                    title: mostPopularStory.title,
                    listenCount: maxListens
                } : null,
                storiesWithListenCounts: storiesWithListenCounts,
                users: users.map(user => ({
                    createdAt: user.createdAt,
                    age: user.age
                }))
            };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }


};