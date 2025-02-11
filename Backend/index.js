// Import the Express framework
const express = require('express');

const cors = require('cors');


// Import the exec function from child_process to run shell commands
const { exec } = require('child_process');

// Import path to safely handle file and directory paths
const path = require('path');

// Import fs to work with the file system
const fs = require('fs');

// Create an Express app
const app = express();
app.use(cors());


// Set the port for our server
const PORT = 3001;

// Define the "downloads" folder path relative to where this file is located
const downloadFolder = path.join(__dirname, 'downloads');

// Check if "downloads" folder exists; if not, create it (including nested folders if needed)
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder, { recursive: true });
}

// Parse JSON bodies in incoming requests
app.use(express.json());

// Handle POST requests to the "/download" endpoint
app.post('/download', (req, res) => {
  // Extract "url" from the JSON body
  const { url } = req.body;

  // If no URL is provided, send a 400 error response
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Set up the output file path pattern for the downloaded video
  const outputFilePath = path.join(downloadFolder, '%(title)s.%(ext)s');

  // Build the yt-dlp command to download the video at the best quality
  const command = `yt-dlp --cookies cookies.txt --no-check-certificate --verbose \
    --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36" \
    -f "bestvideo+bestaudio/best" --merge-output-format mp4 \
    -o "${outputFilePath}" "${url}"`;

  // Execute the command in a child process
  exec(command, (error, stdout, stderr) => {
    // If there's an error, log it and send a 500 response
    if (error) {
      console.error(`Error downloading video: ${error.message}`);
      return res.status(500).json({ error: 'Download failed' });
    }
    // Otherwise, log the successful output and send a success response
    console.log(`Download complete: ${stdout}`);
    res.json({ message: 'Download started', output: stdout });
  });
});

// Start the server listening on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
