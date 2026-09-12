/**
 * backend/models/Appointment.js
 * Appointment model schema definition.
 */

let AppointmentModel = null;

try {
  const mongoose = require('mongoose');
  if (mongoose && mongoose.Schema) {
    const AppointmentSchema = new mongoose.Schema({
      facilityId: { type: String, required: true },
      doctorId: { type: String, default: null },
      patientId: { type: String, default: 'p-001' },
      date: { type: String, required: true },
      timeSlot: { type: String, required: true },
      consultationType: {
        type: String,
        enum: ['in-person', 'teleconsultation', 'assisted'],
        default: 'in-person'
      },
      symptoms: { type: String, default: '' },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'confirmed'
      },
      queueNo: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    });

    AppointmentModel = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
  }
} catch (e) {
  // Pure JS fallback
}

module.exports = {
  Appointment: AppointmentModel
};
