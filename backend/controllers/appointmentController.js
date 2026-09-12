/**
 * backend/controllers/appointmentController.js
 * Controller for creating, listing, and cancelling appointments.
 */

let IN_MEMORY_APPOINTMENTS = [
  {
    id: 'a-001',
    _id: 'a-001',
    facilityId: 'f-001',
    facility: 'PHC Khandwa',
    doctorId: 'doc-01',
    doctor: 'Dr. Arjun Mehta',
    date: '2026-09-18',
    timeSlot: '10:30',
    time: '10:30',
    type: 'Follow-up',
    consultationType: 'in-person',
    mode: 'in-person',
    symptoms: 'Mild chest discomfort and routine blood pressure follow-up',
    status: 'confirmed',
    queueNo: 'A-027',
    queue_no: 'A-027',
    createdAt: new Date()
  },
  {
    id: 'a-002',
    _id: 'a-002',
    facilityId: 'f-002',
    facility: 'District Hospital Khandwa',
    doctorId: 'doc-04',
    doctor: 'Dr. Sunita Rao',
    date: '2026-09-24',
    timeSlot: '14:00',
    time: '14:00',
    type: 'Specialist Consultation',
    consultationType: 'teleconsultation',
    mode: 'teleconsultation',
    symptoms: 'Diabetes sugar reading review and medication adjustment',
    status: 'pending',
    queueNo: 'B-004',
    queue_no: 'B-004',
    createdAt: new Date()
  },
  {
    id: 'a-003',
    _id: 'a-003',
    facilityId: 'f-001',
    facility: 'PHC Khandwa',
    doctorId: 'doc-01',
    doctor: 'Dr. Arjun Mehta',
    date: '2026-08-10',
    timeSlot: '09:30',
    time: '09:30',
    type: 'General Checkup',
    consultationType: 'in-person',
    mode: 'in-person',
    symptoms: 'Seasonal cough and mild headache',
    status: 'completed',
    queueNo: 'A-012',
    queue_no: 'A-012',
    createdAt: new Date('2026-08-01')
  }
];

let queueCounter = 30;

/**
 * GET /api/appointments
 * Lists patient appointments
 */
const getAppointments = async (req, res) => {
  try {
    return res.json({
      success: true,
      count: IN_MEMORY_APPOINTMENTS.length,
      appointments: IN_MEMORY_APPOINTMENTS
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/appointments
 * Accepts { facilityId, doctorId, date, timeSlot, consultationType, symptoms }
 */
const createAppointment = async (req, res) => {
  try {
    const {
      facilityId,
      facilityName,
      doctorId,
      doctorName,
      date,
      timeSlot,
      consultationType = 'in-person',
      symptoms = ''
    } = req.body;

    if (!date || !timeSlot) {
      return res.status(400).json({ success: false, message: 'Date and time slot are required.' });
    }

    queueCounter += 1;
    const queueNo = `A-0${queueCounter}`;

    const newAppointment = {
      id: `a-${Date.now()}`,
      _id: `a-${Date.now()}`,
      facilityId: facilityId || 'f-001',
      facility: facilityName || 'CareConnect Facility',
      doctorId: doctorId || null,
      doctor: doctorName || 'Attending Physician',
      date,
      timeSlot,
      time: timeSlot,
      consultationType,
      mode: consultationType,
      symptoms,
      type: 'OPD Consultation',
      status: 'confirmed',
      queueNo,
      queue_no: queueNo,
      createdAt: new Date()
    };

    IN_MEMORY_APPOINTMENTS.unshift(newAppointment);

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: newAppointment
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/appointments/:id/cancel
 * Updates status to 'cancelled'
 */
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = IN_MEMORY_APPOINTMENTS.find(a => a.id === id || a._id === id);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    appt.status = 'cancelled';

    return res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: appt
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  cancelAppointment
};
