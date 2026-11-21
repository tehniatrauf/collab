const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Railway Database using the Environment Variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Railway
});

// Test Route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Example: Fetch documents
app.get('/api/documents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));