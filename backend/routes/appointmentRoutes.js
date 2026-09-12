/**
 * backend/routes/appointmentRoutes.js
 * Appointment routes definition.
 */

const express = require('express');
const router = express.Router();
const {
  getAppointments,
  createAppointment,
  cancelAppointment
} = require('../controllers/appointmentController');

router.get('/', getAppointments);
router.post('/', createAppointment);
router.patch('/:id/cancel', cancelAppointment);

module.exports = router;
