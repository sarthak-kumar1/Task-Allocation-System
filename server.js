const express = require('express');
const multer = require('multer');
const fastcsv = require('fast-csv');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configure PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'tcs_task_alloc',
  password: process.env.PG_PASSWORD || '',
  port: process.env.PG_PORT || 5432,
});

app.use(express.json());
app.use(express.static('public'));

// Test connection on startup
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected! Current time:', result.rows[0].now);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message || err);
  }
}

// --- MAIN CSV UPLOAD ENDPOINT: FIXED ---
app.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  // Catch any synchronous error
  try {
    if (!req.body.sheetName) {
      return res.status(400).json({ error: 'Sheet name is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const sheetName = req.body.sheetName;
    const filePath = req.file.path;

    // Insert new job sheet and get sheet ID
    let jobSheetId;
    try {
      const sheetRes = await pool.query(
        'INSERT INTO job_sheets (name, total_jobs) VALUES ($1, 0) RETURNING id',
        [sheetName]
      );
      jobSheetId = sheetRes.rows[0].id;
    } catch (err) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Sheet name must be unique' });
    }

    // Parse CSV and insert jobs (inside a function so response is always returned)
    const jobs = [];
    let responded = false;
    fs.createReadStream(filePath)
      .pipe(fastcsv.parse({ headers: true }))
      .on('error', (error) => {
        fs.unlinkSync(filePath);
        if (!responded) {
          responded = true;
          return res.status(500).json({ error: 'CSV parse error: ' + error.message });
        }
      })
      .on('data', (row) => {
        jobs.push(row);
      })
      .on('end', async () => {
        try {
          // Insert jobs
          for (const row of jobs) {
            const tileId = row.tile_id || row.TileId || row.Tile_ID || row.tileID;
            if (!tileId) continue;

            const rowData = { ...row };
            delete rowData.tile_id;
            delete rowData.TileId;
            delete rowData.Tile_ID;
            delete rowData.tileID;

            await pool.query(
              'INSERT INTO jobs (job_sheet_id, tile_id, row_data) VALUES ($1, $2, $3)',
              [jobSheetId, tileId, rowData]
            );
          }

          // Update number of jobs in the sheet
          await pool.query(
            'UPDATE job_sheets SET total_jobs = $1 WHERE id = $2',
            [jobs.length, jobSheetId]
          );
          fs.unlinkSync(filePath);

          if (!responded) {
            responded = true;
            return res.json({
              message: `Uploaded ${jobs.length} rows to sheet "${sheetName}"`,
              sheet_id: jobSheetId,
            });
          }
        } catch (insertErr) {
          fs.unlinkSync(filePath);
          if (!responded) {
            responded = true;
            return res.status(500).json({ error: insertErr.message });
          }
        }
      });

    // SAFETY: Prevent double response, just in case
    setTimeout(() => {
      if (!responded) {
        responded = true;
        fs.unlinkSync(filePath);
        res.status(500).json({ error: 'Server timeout during file processing' });
      }
    }, 60 * 1000); // 1 minute safety timeout

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// --- other endpoints (unchanged) ---
app.get('/job-sheets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_sheets ORDER BY uploaded_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/search-users', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.json([]);
    }
    const queryStr = `%${q}%`;
    const result = await pool.query(
      'SELECT * FROM users WHERE full_name ILIKE $1 LIMIT 10',
      [queryStr]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/available-tiles/:sheetId', async (req, res) => {
  try {
    const { sheetId } = req.params;
    if (!sheetId) {
      return res.status(400).json({ error: 'sheetId is required' });
    }
    const result = await pool.query(
      `SELECT tile_id, COUNT(*) as count
       FROM jobs
       WHERE job_sheet_id = $1 AND assigned_user_id IS NULL
       GROUP BY tile_id`,
      [sheetId]
    );
    const tileGroups = {};
    result.rows.forEach(row => {
      tileGroups[row.tile_id] = parseInt(row.count, 10);
    });
    res.json(tileGroups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/allocate-job', async (req, res) => {
  try {
    const { userName, sheetId, tileId } = req.body;
    if (!userName || !sheetId || !tileId) {
      return res.status(400).json({ error: 'userName, sheetId, and tileId are required' });
    }
    const userRes = await pool.query('SELECT id FROM users WHERE full_name = $1 LIMIT 1', [userName]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userRes.rows[0].id;
    const availRes = await pool.query(
      `SELECT id FROM jobs WHERE job_sheet_id = $1 AND tile_id = $2 AND assigned_user_id IS NULL`,
      [sheetId, tileId]
    );
    if (availRes.rows.length === 0) {
      return res.status(404).json({ error: 'This tile is already assigned or not found' });
    }
    await pool.query(
      `UPDATE jobs
       SET assigned_user_id = $1, status = 'Assigned', assigned_at = NOW()
       WHERE job_sheet_id = $2 AND tile_id = $3 AND assigned_user_id IS NULL`,
      [userId, sheetId, tileId]
    );
    res.json({
      message: `Assigned Tile ID: ${tileId} (${availRes.rows.length} rows) to ${userName}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

testConnection();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
// This file is the main entry point for the React application