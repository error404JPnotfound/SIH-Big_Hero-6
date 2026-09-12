/**
 * backend/routes/facilityRoutes.js
 * Facility routes definition.
 */

const express = require('express');
const router = express.Router();
const {
  getFacilities,
  getLiveFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility
} = require('../controllers/facilityController');

// Public listing & search
router.get('/', getFacilities);

// Live OpenStreetMap Overpass route — MUST stay above /:id
router.get('/live', getLiveFacilities);

// Facility detail by ID
router.get('/:id', getFacilityById);

// Admin-only operations
router.post('/', createFacility);
router.put('/:id', updateFacility);
router.delete('/:id', deleteFacility);

module.exports = router;
