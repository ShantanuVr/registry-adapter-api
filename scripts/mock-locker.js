const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'evidence-locker' });
});

// Initialize upload endpoint
app.post('/upload/init', (req, res) => {
  const { filename, contentType, size } = req.body;
  
  // Generate mock signed URL
  const uploadId = `upload_${Date.now()}`;
  const signedUrl = `https://mock-storage.example.com/uploads/${uploadId}`;
  
  res.json({
    uploadId,
    signedUrl,
    expiresIn: 3600, // 1 hour
    fields: {
      'Content-Type': contentType || 'application/octet-stream',
    },
  });
});

// Verify upload endpoint
app.post('/upload/verify', (req, res) => {
  const { uploadId, sha256 } = req.body;
  
  // Mock verification
  res.json({
    uploadId,
    verified: true,
    cid: `Qm${uploadId}`,
    sha256,
    url: `https://ipfs.io/ipfs/Qm${uploadId}`,
  });
});

// Get file info endpoint
app.get('/files/:cid', (req, res) => {
  const { cid } = req.params;
  
  res.json({
    cid,
    size: 1024,
    sha256: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    url: `https://ipfs.io/ipfs/${cid}`,
    uploadedAt: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Evidence Locker running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
