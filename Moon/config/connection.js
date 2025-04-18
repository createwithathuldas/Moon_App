// config/connection.js
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Replace with your MongoDB URI
const dbName = 'moon'; // Replace with your database name

let db;

async function connectToDatabase() {
    if (db) return db; // Return the existing connection if already connected

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        console.log('Connected successfully to MongoDB server');
        db = client.db(dbName);
        return db;
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        throw err; // Rethrow the error to handle it in the calling function
    }
}

module.exports = { connectToDatabase };