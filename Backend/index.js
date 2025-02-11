const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create an Express app
const app = express();
app.use(cors());
app.use(express.json());

// Set the port for our server
const PORT = 3001;

// Define the "downloads" folder path relative to where this file is located
const downloadFolder = path.join(__dirname, 'downloads');

// Check if "downloads" folder exists; if not, create it (including nested folders if needed)
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder, { recursive: true });
}

// In-memory job tracker
let jobs = {};

// Helper function to generate a unique jobId
function generateJobId() {
  return Math.random().toString(36).substr(2, 9);
}

// Handle POST requests to the "/download" endpoint
app.post('/download', (req, res) => {
  const { url } = req.body;

  // Validate URL
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Generate a unique jobId
  const jobId = generateJobId();

  // Define the output file path pattern for the downloaded video
  const outputFilePath = path.join(downloadFolder, `${jobId}_%(title)s.%(ext)s`);

  // Build the yt-dlp command to download the video at the best quality
  const command = `yt-dlp --cookies cookies.txt --no-check-certificate --verbose \
    --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36" \
    -f "bestvideo+bestaudio/best" --merge-output-format mp4 \
    -o "${outputFilePath}" --print-json "${url}"`;

  // Initialize the job state
  jobs[jobId] = {
    status: 'queued',
    progress: 0,
    title: 'Fetching...',
    duration: 'Fetching...',
    size: 'Fetching...',
  };

  // Start the download process
  const childProcess = exec(command, { maxBuffer: 1024 * 500 });

  // Stream progress updates using yt-dlp's verbose output
  let totalChunks = 0;
  let downloadedChunks = 0;

  childProcess.stdout.on('data', (data) => {
    try {
      const lines = data.toString().split('\n');
      lines.forEach((line) => {
        // Extract progress percentage
        if (line.includes('progress')) {
          const progressMatch = line.match(/(\d+)%/);
          if (progressMatch) {
            jobs[jobId].progress = parseInt(progressMatch[1], 10);
          }
        }

        // Fallback: Parse chunk information
        if (line.includes('chunk')) {
          const chunkMatch = line.match(/chunk (\d+) of (\d+)/);
          if (chunkMatch) {
            downloadedChunks = parseInt(chunkMatch[1], 10);
            totalChunks = parseInt(chunkMatch[2], 10);
            jobs[jobId].progress = Math.round((downloadedChunks / totalChunks) * 100);
          }
        }

        // Extract metadata
        if (line.includes('"title":')) {
          const json = JSON.parse(line);
          jobs[jobId].title = json.title || 'N/A';
          jobs[jobId].duration = json.duration ? `${Math.floor(json.duration / 60)}:${json.duration % 60}` : 'N/A';
          jobs[jobId].size = json.filesize ? `${(json.filesize / (1024 * 1024)).toFixed(2)} MB` : 'N/A';
        }
      });
    } catch (err) {
      console.error(`Error parsing yt-dlp output: ${err.message}`);
    }
  });

  // Handle errors during execution
  childProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    if (!jobs[jobId].error) {
      jobs[jobId].error = data.toString();
    }
  });

  // Mark the job as completed when the process exits successfully
  childProcess.on('close', (code) => {
    if (code === 0) {
      jobs[jobId].status = 'completed';
    } else {
      jobs[jobId].status = 'failed';
      jobs[jobId].error = `Process exited with code ${code}`;
    }
  });

  // Respond with the jobId
  res.json({ jobId });
});

// Handle GET requests to the "/status/:jobId" endpoint
app.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;

  if (!jobs[jobId]) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(jobs[jobId]);
});

// Start the server listening on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});