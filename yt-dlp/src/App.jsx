import React, { useState, useEffect } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(null);

  // Function to open the modal and fetch available qualities
  const handleDownload = async () => {
    if (!url) return;

    try {
      const response = await fetch(`http://localhost:3001/qualities?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch qualities');
      }

      const data = await response.json();
      setQualities(data.qualities);
      setIsModalOpen(true); // Open the modal
    } catch (error) {
      console.error('Error fetching qualities:', error);
    }
  };

  // Function to start the download with the selected quality
  const startDownload = async () => {
    if (!selectedQuality) {
      alert('Please select a quality');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality: selectedQuality.formatId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start download');
      }

      const data = await response.json();
      const jobId = data.jobId;

      // Add the new job to the state
      setJobs((prevJobs) => [
        ...prevJobs,
        { jobId, status: 'queued', progress: 0, title: 'Fetching...', duration: 'Fetching...', size: 'Fetching...' },
      ]);

      setIsModalOpen(false); // Close the modal
      setUrl(''); // Clear input field
    } catch (error) {
      console.error('Error starting download:', error);
    }
  };

  // Poll for job status updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const updatedJobs = await Promise.all(
        jobs.map(async (job) => {
          try {
            const res = await fetch(`http://localhost:3001/status/${job.jobId}`);
            if (res.ok) {
              const jobData = await res.json();
              return { ...job, ...jobData }; // Merge existing job data with updated data
            }
          } catch (error) {
            console.error('Error fetching job status:', error);
          }
          return job; // Return the original job if there's an error
        })
      );

      setJobs(updatedJobs); // Update the jobs state
    }, 2000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [jobs]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Video Downloader</h1>
      <div className="w-full max-w-md">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Paste a YouTube URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleDownload}
          className="w-full bg-blue-500 text-white font-semibold py-2 rounded-md hover:bg-blue-600 transition duration-300 cursor-pointer"
        >
          Download
        </button>
      </div>

      {/* Modal for quality selection */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-96">
            <h2 className="text-2xl font-bold mb-4">Select Quality</h2>
            <ul>
              {qualities.map((quality) => (
                <li
                  key={quality.formatId}
                  className={`cursor-pointer py-2 hover:bg-gray-100 rounded-md ${
                    selectedQuality?.formatId === quality.formatId ? 'bg-gray-200' : ''
                  }`}
                  onClick={() => setSelectedQuality(quality)}
                >
                  {quality.formatNote} ({quality.extension})
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="mr-2 bg-gray-400 text-white py-2 px-4 rounded-md hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={startDownload}
                className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table to display job statuses */}
      <div className="mt-8 w-full max-w-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 text-left font-medium text-gray-700">Job ID</th>
              <th className="p-2 text-left font-medium text-gray-700">Title</th>
              <th className="p-2 text-left font-medium text-gray-700">Duration</th>
              <th className="p-2 text-left font-medium text-gray-700">Size</th>
              <th className="p-2 text-left font-medium text-gray-700">Status</th>
              <th className="p-2 text-left font-medium text-gray-700">Progress</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.jobId} className="border-b border-gray-200">
                <td className="p-2 text-gray-700">{job.jobId}</td>
                <td className="p-2 text-gray-700">{job.title || 'N/A'}</td>
                <td className="p-2 text-gray-700">{job.duration || 'N/A'}</td>
                <td className="p-2 text-gray-700">{job.size || 'N/A'}</td>
                <td className="p-2 text-gray-700">
                  {job.status === 'loading' ? (
                    <span className="text-yellow-500">Loading...</span>
                  ) : job.status === 'completed' ? (
                    <span className="text-green-500">Completed</span>
                  ) : job.status === 'failed' ? (
                    <span className="text-red-500">Failed</span>
                  ) : (
                    job.status || 'N/A'
                  )}
                </td>
                <td className="p-2 text-gray-700">
                  {job.progress !== undefined && job.progress >= 0 ? (
                    `${job.progress}%`
                  ) : (
                    <span className="text-gray-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;