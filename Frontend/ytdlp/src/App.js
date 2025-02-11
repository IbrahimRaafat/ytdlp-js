import React, { useState, useEffect } from 'react';

function App() {
  // Store the input URL
  const [url, setUrl] = useState('');
  // Store the list of download jobs
  const [jobs, setJobs] = useState([]);

  // Send a request to start the download
  const handleDownload = async () => {
    if (!url) return;
    try {
      const response = await fetch('http://localhost:3001/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      // If the server responds with a jobId, add it to our jobs list
      if (data.jobId) {
        setJobs((prevJobs) => [
          ...prevJobs,
          { jobId: data.jobId, status: 'queued', progress: 0 }
        ]);
      }
      setUrl(''); // Clear input
    } catch (error) {
      console.error('Error starting download:', error);
    }
  };

  // Poll for job progress every few seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      // Fetch status for each job
      const updatedJobs = await Promise.all(
        jobs.map(async (job) => {
          try {
            const res = await fetch(`http://localhost:3001/status/${job.jobId}`);
            if (res.ok) {
              const jobData = await res.json();
              return { ...job, ...jobData };
            }
          } catch (error) {
            console.error('Error fetching job status:', error);
          }
          return job;
        })
      );
      setJobs(updatedJobs);
    }, 2000); // Adjust interval as needed

    return () => clearInterval(interval);
  }, [jobs]);

  return (
    <div>
      <h1>Video Downloader</h1>
      <input
        placeholder="Paste a YouTube URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button onClick={handleDownload}>Download</button>

      <table>
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.jobId}>
              <td>{job.jobId}</td>
              <td>{job.status}</td>
              <td>{`${job.progress || 0}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
