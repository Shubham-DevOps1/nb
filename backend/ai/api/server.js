const express = require('express');
const searchRoutes = require('./searchRoutes');
const logger = require('../utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());

// Register routes
app.use('/api', searchRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled API Error', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  logger.success(`TalentIQ AI Search API Server running on port ${PORT}`);
  logger.info(`Endpoint: http://localhost:${PORT}/api/search`);
});
