// server/src/index.js
import express from 'express';
import mongoose from 'mongoose';
// ... other imports

const app = express();
// ... middleware and routes

// Database connection (for Serverless, it's best to place it here or cache the connection)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// ⚠️ Key: Export app instead of listening
// If your package.json has "type": "module", use export default app
export default app;