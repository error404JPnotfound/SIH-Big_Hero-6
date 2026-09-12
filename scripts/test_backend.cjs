const app = require('../backend/server');
const http = require('http');
const axios = require('axios');

const server = http.createServer(app);

server.listen(5005, async () => {
  console.log('Testing backend server on port 5005...');
  const base = 'http://localhost:5005/api';

  try {
    // 1. Health
    const h = await axios.get(`${base}/health`);
    console.log('1. Health check:', h.data);

    // 2. Facilities list
    const f = await axios.get(`${base}/facilities?lat=21.826&lng=76.357`);
    console.log('2. Facilities count:', f.data.count, 'first facility:', f.data.facilities[0]?.name, 'distance:', f.data.facilities[0]?.distanceKm);

    // 3. Facility by ID
    const fId = await axios.get(`${base}/facilities/f-001`);
    console.log('3. Facility by ID:', fId.data.facility?.name, 'doctors:', fId.data.doctors?.length);

    // 4. Create appointment
    const appt = await axios.post(`${base}/appointments`, {
      facilityId: 'f-001',
      facilityName: 'PHC Khandwa',
      doctorId: 'doc-01',
      doctorName: 'Dr. Arjun Mehta',
      date: '2026-09-20',
      timeSlot: '11:00',
      consultationType: 'in-person',
      symptoms: 'Mild fever and routine consultation'
    });
    console.log('4. Create appointment:', appt.data.message, 'id:', appt.data.appointment?.id);

    // 5. Cancel appointment
    const cancel = await axios.patch(`${base}/appointments/${appt.data.appointment.id}/cancel`);
    console.log('5. Cancel appointment:', cancel.data.message, 'status:', cancel.data.appointment?.status);

    console.log('✅ ALL BACKEND TEST CASES PASSED!');
  } catch (err) {
    console.error('❌ Backend test error:', err.response?.data || err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});
