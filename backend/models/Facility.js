/**
 * backend/models/Facility.js
 * Facility model schema definition (Mongoose/Object shape).
 */

const FACILITY_TYPES = ['PHC', 'CHC', 'District Hospital', 'Sub-Centre', 'Diagnostic Centre'];

// If Mongoose is available, create schema; otherwise export object schema validator
let FacilityModel = null;

try {
  const mongoose = require('mongoose');
  if (mongoose && mongoose.Schema) {
    const FacilitySchema = new mongoose.Schema({
      name: { type: String, required: true },
      type: { type: String, enum: FACILITY_TYPES, required: true },
      address: { type: String, default: '' },
      village: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      phone: { type: String, default: null },
      emergencyPhone: { type: String, default: null },
      services: { type: [String], default: [] },
      diagnosticsAvailable: { type: [String], default: [] },
      emergencyAvailable: { type: Boolean, default: false },
      openingHours: { type: String, default: '' },
      bedCapacity: { type: Number, default: 0 },
      availableBeds: { type: Number, default: 0 },
      doctorsAvailableNow: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    });

    FacilityModel = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);
  }
} catch (e) {
  // Mongoose not installed or used; using pure JS structure
}

module.exports = {
  Facility: FacilityModel,
  FACILITY_TYPES
};
