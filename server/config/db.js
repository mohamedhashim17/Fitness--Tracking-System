const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let memoryServer = null;

/**
 * Connects to MongoDB using MONGODB_URI.
 * If local MongoDB is unavailable in development, falls back cleanly to
 * mongodb-memory-server so the full application works immediately out-of-the-box.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri !== 'memory') {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return { mode: 'external', uri };
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
      }
      console.warn(
        `Local MongoDB unavailable (${err.message}). Starting embedded MongoDB server for development...`
      );
    }
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const cacheDir = path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');
  let systemBinary;
  if (fs.existsSync(cacheDir)) {
    const exe = fs.readdirSync(cacheDir).find((f) => f.startsWith('mongod') && f.endsWith('.exe'));
    if (exe) systemBinary = path.join(cacheDir, exe);
  }

  memoryServer = await MongoMemoryServer.create(
    systemBinary ? { binary: { systemBinary } } : undefined
  );
  const memUri = memoryServer.getUri('fitnex');
  const conn = await mongoose.connect(memUri);
  console.log(`Embedded MongoDB connected: ${conn.connection.host} (dev fallback)`);
  return { mode: 'memory', uri: memUri };
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

module.exports = { connectDB, disconnectDB };
