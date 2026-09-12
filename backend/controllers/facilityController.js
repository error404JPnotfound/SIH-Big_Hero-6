/**
 * backend/controllers/facilityController.js
 * Controller for facility search, live OSM query, detail view, and management.
 */

const { fetchNearbyHospitalsFromOSM } = require('../services/osmFacilityService');

// Haversine formula for calculating distance in km
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Seed / In-memory dataset fallback for standalone execution
let IN_MEMORY_FACILITIES = [
  {
    id: 'f-001',
    _id: 'f-001',
    name: 'PHC Khandwa',
    type: 'PHC',
    address: 'Near Bus Stand, Civil Lines, Khandwa',
    village: 'Khandwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8265,
    longitude: 76.3572,
    phone: '07322-234567',
    emergencyPhone: '07322-234500',
    services: ['OPD', 'Maternal & Child Health', 'Immunisation', 'Family Planning', 'TB DOTS', 'Malaria Control', 'First Aid'],
    diagnosticsAvailable: ['Blood Sugar', 'Haemoglobin', 'Urine Routine', 'Malaria Test', 'Pregnancy Test'],
    emergencyAvailable: true,
    openingHours: 'Mon–Sat 8:00 AM – 2:00 PM',
    bedCapacity: 10,
    availableBeds: 4,
    doctorsAvailableNow: 2,
    doctors: [
      { id: 'doc-01', name: 'Dr. Arjun Mehta', specialization: 'General Physician', isAvailable: true, phone: '07322-234567' },
      { id: 'doc-02', name: 'Dr. Priyanka Das', specialization: 'Gynaecologist', isAvailable: true, phone: '07322-234568' },
      { id: 'doc-03', name: 'Dr. Ramesh Joshi', specialization: 'Paediatrician', isAvailable: false, phone: '07322-234569' }
    ]
  },
  {
    id: 'f-002',
    _id: 'f-002',
    name: 'District Hospital Khandwa',
    type: 'District Hospital',
    address: 'Hospital Road, Khandwa City',
    village: 'Khandwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8198,
    longitude: 76.3489,
    phone: '07322-245000',
    emergencyPhone: '07322-245001',
    services: ['OPD', 'Emergency', 'Surgery', 'Maternity', 'Paediatrics', 'Orthopaedics', 'ICU', 'Blood Bank', 'X-Ray', 'Dialysis'],
    diagnosticsAvailable: ['Complete Blood Count', 'Blood Culture', 'X-Ray', 'Ultrasound', 'ECG', 'CT Scan', 'Pathology Lab'],
    emergencyAvailable: true,
    openingHours: '24 × 7',
    bedCapacity: 150,
    availableBeds: 23,
    doctorsAvailableNow: 4,
    doctors: [
      { id: 'doc-04', name: 'Dr. Sunita Rao', specialization: 'General Medicine', isAvailable: true, phone: '07322-245001' },
      { id: 'doc-05', name: 'Dr. Vijay Sharma', specialization: 'Orthopaedics', isAvailable: true, phone: '07322-245002' },
      { id: 'doc-06', name: 'Dr. Anita Patel', specialization: 'Gynaecology', isAvailable: true, phone: '07322-245003' },
      { id: 'doc-07', name: 'Dr. K. Iyer', specialization: 'Internal Medicine', isAvailable: false, phone: '07322-245004' }
    ]
  },
  {
    id: 'f-003',
    _id: 'f-003',
    name: 'Sub-Centre Rampur',
    type: 'Sub-Centre',
    address: 'Main Road, Village Rampur',
    village: 'Rampur',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8420,
    longitude: 76.3290,
    phone: '07322-256100',
    emergencyPhone: null,
    services: ['Basic OPD', 'Immunisation', 'Ante-natal Check', 'Family Planning Counselling'],
    diagnosticsAvailable: ['Pregnancy Test', 'Malaria RDT'],
    emergencyAvailable: false,
    openingHours: 'Mon, Wed, Fri 9:00 AM – 1:00 PM',
    bedCapacity: 2,
    availableBeds: 2,
    doctorsAvailableNow: 1,
    doctors: [
      { id: 'doc-08', name: 'Dr. Mohit Gupta', specialization: 'General Physician', isAvailable: true, phone: '07322-256001' }
    ]
  },
  {
    id: 'f-004',
    _id: 'f-004',
    name: 'CHC Sanawad',
    type: 'CHC',
    address: 'Sanawad Town, Near Narmada Bridge',
    village: 'Sanawad',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.7738,
    longitude: 76.0630,
    phone: '07322-267000',
    emergencyPhone: '07322-267999',
    services: ['OPD', 'Emergency', 'Maternity', 'Minor Surgery', 'Dental', 'Eye Care', 'Physiotherapy'],
    diagnosticsAvailable: ['Blood Tests', 'X-Ray', 'ECG', 'Urine Routine', 'Ultrasound'],
    emergencyAvailable: true,
    openingHours: 'Mon–Sat 8:00 AM – 4:00 PM',
    bedCapacity: 30,
    availableBeds: 8,
    doctorsAvailableNow: 2,
    doctors: [
      { id: 'doc-09', name: 'Dr. Leela Sharma', specialization: 'General Physician', isAvailable: true, phone: '07322-267001' },
      { id: 'doc-10', name: 'Dr. Nikhil Tiwari', specialization: 'Dental Surgeon', isAvailable: true, phone: '07322-267002' }
    ]
  },
  {
    id: 'f-005',
    _id: 'f-005',
    name: 'PHC Khalwa',
    type: 'PHC',
    address: 'Khalwa Block Office Road, Khalwa',
    village: 'Khalwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.6950,
    longitude: 76.4800,
    phone: '07322-278200',
    emergencyPhone: null,
    services: ['OPD', 'Maternal Health', 'Immunisation', 'TB DOTS'],
    diagnosticsAvailable: ['Blood Sugar', 'Haemoglobin', 'Pregnancy Test'],
    emergencyAvailable: false,
    openingHours: 'Mon–Sat 9:00 AM – 1:00 PM',
    bedCapacity: 6,
    availableBeds: 3,
    doctorsAvailableNow: 1,
    doctors: [
      { id: 'doc-11', name: 'Dr. Rupa Verma', specialization: 'General Physician', isAvailable: false, phone: '07322-278001' }
    ]
  },
  {
    id: 'f-006',
    _id: 'f-006',
    name: 'Diagnostic Centre Khandwa',
    type: 'Diagnostic Centre',
    address: 'MG Road, Khandwa City',
    village: 'Khandwa',
    district: 'Khandwa',
    state: 'Madhya Pradesh',
    latitude: 21.8310,
    longitude: 76.3590,
    phone: '07322-289100',
    emergencyPhone: null,
    services: ['Pathology', 'Radiology', 'Cardiology Investigations', 'Sample Collection'],
    diagnosticsAvailable: ['Complete Blood Count', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'HbA1c', 'Thyroid Panel', 'X-Ray', 'Ultrasound', 'ECG', 'Echo', 'MRI', 'CT Scan'],
    emergencyAvailable: false,
    openingHours: 'Mon–Sat 7:00 AM – 8:00 PM',
    bedCapacity: 0,
    availableBeds: 0,
    doctorsAvailableNow: 2,
    doctors: [
      { id: 'doc-12', name: 'Dr. S. Krishnan', specialization: 'Radiologist', isAvailable: true, phone: '07322-289001' },
      { id: 'doc-13', name: 'Dr. Meena Singh', specialization: 'Pathologist', isAvailable: true, phone: '07322-289002' }
    ]
  }
];

/**
 * GET /api/facilities
 * Filters facilities by query params and calculates distances if lat/lng are provided.
 */
const getFacilities = async (req, res) => {
  try {
    const { search, type, emergency, service, district, lat, lng, maxDistance } = req.query;

    let facilities = [...IN_MEMORY_FACILITIES];

    // Filter by type
    if (type) {
      facilities = facilities.filter(f => f.type.toLowerCase() === type.toLowerCase());
    }

    // Filter by district
    if (district) {
      facilities = facilities.filter(f => f.district.toLowerCase() === district.toLowerCase());
    }

    // Filter by emergency
    if (emergency === 'true' || emergency === true) {
      facilities = facilities.filter(f => f.emergencyAvailable);
    }

    // Filter by service
    if (service) {
      const qService = service.toLowerCase();
      facilities = facilities.filter(f => f.services && f.services.some(s => s.toLowerCase().includes(qService)));
    }

    // Free-text search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      facilities = facilities.filter(f =>
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.village && f.village.toLowerCase().includes(q)) ||
        (f.district && f.district.toLowerCase().includes(q)) ||
        (f.address && f.address.toLowerCase().includes(q)) ||
        (f.services && f.services.some(s => s.toLowerCase().includes(q)))
      );
    }

    // Distance calculation and sorting
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    const hasCoords = !isNaN(pLat) && !isNaN(pLng);

    facilities = facilities.map(f => {
      const dist = hasCoords ? calculateDistanceKm(pLat, pLng, f.latitude, f.longitude) : null;
      return { ...f, distanceKm: dist };
    });

    // Filter by maxDistance if coords provided
    const maxDist = parseFloat(maxDistance);
    if (hasCoords && !isNaN(maxDist) && maxDist > 0) {
      facilities = facilities.filter(f => f.distanceKm != null && f.distanceKm <= maxDist);
    }

    // Sort ascending by distance if coordinates provided
    if (hasCoords) {
      facilities.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return res.json({
      success: true,
      count: facilities.length,
      facilities
    });
  } catch (error) {
    console.error('getFacilities error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching facilities' });
  }
};

/**
 * GET /api/facilities/live?lat=..&lng=..&radius=meters
 * Real OpenStreetMap hospital data via Overpass API.
 */
const getLiveFacilities = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);

    if (isNaN(pLat) || isNaN(pLng)) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required.' });
    }

    const radiusMeters = radius ? parseInt(radius, 10) : 15000;
    const rawFacilities = await fetchNearbyHospitalsFromOSM(pLat, pLng, radiusMeters);

    const facilities = rawFacilities
      .map((f) => ({ ...f, distanceKm: calculateDistanceKm(pLat, pLng, f.latitude, f.longitude) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ success: true, count: facilities.length, facilities, source: 'live-osm' });
  } catch (error) {
    console.error('getLiveFacilities error:', error);
    return res.status(502).json({ success: false, message: 'Failed to fetch live facility data from OpenStreetMap. Try again shortly.' });
  }
};

/**
 * GET /api/facilities/:id
 * Returns a single facility and its doctors.
 */
const getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const facility = IN_MEMORY_FACILITIES.find(f => f.id === id || f._id === id);

    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    return res.json({
      success: true,
      facility,
      doctors: facility.doctors || []
    });
  } catch (error) {
    console.error('getFacilityById error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching facility details' });
  }
};

/**
 * POST /api/facilities (Admin only)
 */
const createFacility = async (req, res) => {
  try {
    const newFacility = {
      id: `f-${Date.now()}`,
      _id: `f-${Date.now()}`,
      ...req.body,
      createdAt: new Date()
    };
    IN_MEMORY_FACILITIES.push(newFacility);
    return res.status(201).json({ success: true, facility: newFacility });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/facilities/:id (Admin only)
 */
const updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const index = IN_MEMORY_FACILITIES.findIndex(f => f.id === id || f._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    IN_MEMORY_FACILITIES[index] = { ...IN_MEMORY_FACILITIES[index], ...req.body };
    return res.json({ success: true, facility: IN_MEMORY_FACILITIES[index] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/facilities/:id (Admin only)
 */
const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const index = IN_MEMORY_FACILITIES.findIndex(f => f.id === id || f._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    IN_MEMORY_FACILITIES.splice(index, 1);
    return res.json({ success: true, message: 'Facility deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  calculateDistanceKm,
  getFacilities,
  getLiveFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility
};
