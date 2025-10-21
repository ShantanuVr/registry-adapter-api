const express = require('express');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'iot-oracle' });
});

// Get latest digest for project
app.get('/digest/latest', (req, res) => {
  const { projectId } = req.query;
  
  // Mock IoT data
  const digest = {
    projectId: projectId || 'PRJ001',
    kwh: 1000,
    tco2e: 0.5,
    date: new Date().toISOString(),
    digestHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    cid: 'QmMockDigestHash',
    metadata: {
      sensorCount: 10,
      dataPoints: 1000,
      quality: 'HIGH',
    },
  };
  
  res.json(digest);
});

// Get digest by date range
app.get('/digest/range', (req, res) => {
  const { projectId, startDate, endDate } = req.query;
  
  // Mock multiple digests
  const digests = [
    {
      projectId: projectId || 'PRJ001',
      kwh: 950,
      tco2e: 0.48,
      date: startDate || '2024-01-01T00:00:00Z',
      digestHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      cid: 'QmDigest1',
    },
    {
      projectId: projectId || 'PRJ001',
      kwh: 1050,
      tco2e: 0.52,
      date: endDate || '2024-01-02T00:00:00Z',
      digestHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      cid: 'QmDigest2',
    },
  ];
  
  res.json(digests);
});

// Get project metrics
app.get('/metrics/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  res.json({
    projectId,
    totalKwh: 50000,
    totalTco2e: 25.0,
    averageDailyKwh: 1000,
    averageDailyTco2e: 0.5,
    lastUpdated: new Date().toISOString(),
    dataQuality: 'HIGH',
    sensorStatus: 'ACTIVE',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`IoT Oracle running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
