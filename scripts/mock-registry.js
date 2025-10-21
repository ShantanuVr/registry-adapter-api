const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';

app.use(express.json());

// Generate JWKS for JWT verification
const generateJWKS = () => {
  // In a real implementation, this would use proper RSA keys
  // For demo purposes, we'll use a simple key
  return {
    keys: [
      {
        kty: 'RSA',
        kid: 'demo-key-id',
        use: 'sig',
        alg: 'RS256',
        n: 'demo-n-value',
        e: 'AQAB',
      },
    ],
  };
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'registry-simulator' });
});

// JWKS endpoint
app.get('/.well-known/jwks.json', (req, res) => {
  res.json(generateJWKS());
});

// Generate demo JWT token
app.post('/auth/token', (req, res) => {
  const { sub, orgId, role } = req.body;
  
  const token = jwt.sign(
    {
      sub: sub || 'demo-user',
      orgId: orgId || 'ORG001',
      role: role || 'ISSUER',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      iss: 'https://registry.example.com',
      aud: 'registry-adapter-api',
    },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );

  res.json({ token });
});

// Mock project validation endpoint
app.get('/internal/projects/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    id,
    status: 'APPROVED',
    methodology: 'VCS',
    country: 'US',
    sector: 'Forestry',
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });
});

// Mock issuance endpoint
app.post('/issuances', (req, res) => {
  const issuance = {
    id: `ISS${Date.now()}`,
    projectId: req.body.projectId,
    quantity: req.body.quantity,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  
  res.status(201).json(issuance);
});

// Mock retirement endpoint
app.post('/retirements', (req, res) => {
  const retirement = {
    id: `RET${Date.now()}`,
    classId: req.body.classId,
    quantity: req.body.quantity,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  
  res.status(201).json(retirement);
});

// Start server
app.listen(PORT, () => {
  console.log(`Registry Simulator running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`JWKS: http://localhost:${PORT}/.well-known/jwks.json`);
});
