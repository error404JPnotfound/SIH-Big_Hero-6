/**
 * backend/server.js
 * Main entry point for the CareConnect Express API server.
 */

const express = require('express');
const cors = require('cors');

const facilityRoutes = require('./routes/facilityRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/facilities', facilityRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CareConnect API'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CareConnect API server running on port ${PORT}`);
    console.log(`  Facilities API:   http://localhost:${PORT}/api/facilities`);
    console.log(`  Live OSM API:     http://localhost:${PORT}/api/facilities/live?lat=21.826&lng=76.357`);
    console.log(`  Appointments API: http://localhost:${PORT}/api/appointments`);
  });
}

module.exports = app;
