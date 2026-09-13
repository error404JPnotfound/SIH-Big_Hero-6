/**
 * src/services/api.js
 * API client and services for facilities and appointments.
 * Works with Express backend, Supabase, OpenStreetMap and mock fallbacks.
 */

import axios from 'axios';
import {
  MOCK_FACILITIES,
  MOCK_DOCTORS_BY_FACILITY,
  MOCK_APPOINTMENTS
} from '../lib/mockData';

import {
  getFacilities as getDbFacilities,
  getFacilityById as getDbFacilityById,
  getDoctorsByFacility as getDbDoctors,
  getMyAppointments as getDbAppointments,
  bookAppointment as dbBookAppointment,
  cancelAppointment as dbCancelAppointment
} from '../lib/db';

import {
  supabase,
  isSupabaseConfigured
} from '../lib/supabase';

import {
  DB_TO_DISPLAY_TYPE,
  DISPLAY_TO_DB_TYPE
} from '../lib/facilityTypes';


const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// ============================================================
// LIVE OSM CACHE
// ============================================================

export const liveOsmCache = new Map();


// ============================================================
// DISTANCE CALCULATION
// ============================================================

export function calculateDistanceKm(
  lat1,
  lon1,
  lat2,
  lon2
) {

  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null
  ) {
    return null;
  }

  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

    Math.cos(
      (lat1 * Math.PI) / 180
    ) *

    Math.cos(
      (lat2 * Math.PI) / 180
    ) *

    Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return Math.round(
    R * c * 10
  ) / 10;
}


// ============================================================
// OPEN STREET MAP / OVERPASS
// ============================================================

const OVERPASS_URL =
  'https://overpass-api.de/api/interpreter';


const buildOverpassQuery = (
  lat,
  lon,
  radiusMeters
) => `

[out:json][timeout:25];

(
  node["amenity"~"^(hospital|clinic|doctors)$"]
  (around:${radiusMeters},${lat},${lon});

  way["amenity"~"^(hospital|clinic|doctors)$"]
  (around:${radiusMeters},${lat},${lon});

  node["healthcare"]
  (around:${radiusMeters},${lat},${lon});

  way["healthcare"]
  (around:${radiusMeters},${lat},${lon});
);

out center tags;

`;


// ============================================================
// MAP OSM FACILITY TYPE
// ============================================================

const mapAmenityToType = (tags) => {

  if (
    tags.amenity === 'hospital' ||
    tags.healthcare === 'hospital'
  ) {
    return 'District Hospital';
  }

  if (
    tags.amenity === 'clinic' ||
    tags.healthcare === 'clinic'
  ) {
    return 'CHC';
  }

  if (
    tags.amenity === 'doctors' ||
    tags.healthcare === 'doctor'
  ) {
    return 'PHC';
  }

  return 'PHC';
};


// ============================================================
// BUILD ADDRESS
// ============================================================

const buildAddress = (tags) => {

  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city']
  ].filter(Boolean);

  return parts.length
    ? parts.join(', ')
    : 'Address not tagged on OpenStreetMap';
};


// ============================================================
// CONVERT OSM ELEMENT → FACILITY
// ============================================================

const elementToFacility = (el) => {

  const tags = el.tags || {};

  const lat =
    el.lat ??
    el.center?.lat;

  const lon =
    el.lon ??
    el.center?.lon;

  if (
    lat == null ||
    lon == null
  ) {
    return null;
  }

  if (!tags.name) {
    return null;
  }

  const id =
    `osm-${el.type}-${el.id}`;

  return {

    _id: id,
    id: id,

    name: tags.name,

    type:
      mapAmenityToType(tags),

    address:
      buildAddress(tags),

    village:
      tags['addr:suburb'] ||
      tags['addr:city'] ||
      '',

    district:
      tags['addr:city'] ||
      tags['addr:district'] ||
      '',

    state:
      tags['addr:state'] ||
      '',

    latitude: lat,
    longitude: lon,

    phone:
      tags.phone ||
      tags['contact:phone'] ||
      null,

    emergencyPhone: '108',

    services:
      tags['healthcare:speciality']
        ? tags['healthcare:speciality']
            .split(';')
            .map(s => s.trim())
        : [],

    diagnosticsAvailable: [],

    emergencyAvailable:
      tags.emergency === 'yes',

    openingHours:
      tags.opening_hours ||
      'Not listed on OpenStreetMap',

    bedCapacity:
      tags.beds
        ? Number(tags.beds)
        : undefined,

    availableBeds: undefined,

    doctorsAvailableNow: undefined,

    source: 'OpenStreetMap',
  };
};


// ============================================================
// FETCH OSM DIRECTLY
// ============================================================

async function fetchDirectOverpass(
  lat,
  lon,
  radiusMeters = 15000
) {

  const query =
    buildOverpassQuery(
      lat,
      lon,
      radiusMeters
    );

  const res =
    await axios.post(

      OVERPASS_URL,

      `data=${encodeURIComponent(query)}`,

      {
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        timeout: 20000,
      }
    );


  const elements =
    res.data?.elements || [];


  const seen =
    new Set();


  const list = [];


  for (const el of elements) {

    const f =
      elementToFacility(el);

    if (!f) {
      continue;
    }


    const key =
      `${f.name}|${f.latitude.toFixed(4)}|${f.longitude.toFixed(4)}`;


    if (
      seen.has(key)
    ) {
      continue;
    }


    seen.add(key);

    list.push(f);
  }


  return list;
}


// ============================================================
// FACILITY SERVICE
// ============================================================

export const facilityService = {

  // ----------------------------------------------------------
  // GET ALL FACILITIES
  // ----------------------------------------------------------

  getAll: async (
    params = {}
  ) => {


    // Try Express backend first
    // only if VITE_API_URL exists

    if (
      import.meta.env.VITE_API_URL
    ) {

      try {

        const response =
          await api.get(
            '/facilities',
            { params }
          );


        if (
          response.data?.facilities
        ) {

          return response.data.facilities;
        }

      } catch (err) {

        console.warn(
          'Backend facility request failed. Falling back.',
          err
        );
      }
    }


    const {

      search = '',

      type = '',

      district = '',

      emergency = false,

      maxDistance = 0,

      lat = null,

      lng = null,

    } = params;


    const pLat =
      lat != null
        ? parseFloat(lat)
        : null;


    const pLng =
      lng != null
        ? parseFloat(lng)
        : null;


    const hasCoords =

      pLat != null &&

      pLng != null &&

      !isNaN(pLat) &&

      !isNaN(pLng);


    // --------------------------------------------------------
    // SUPABASE RPC
    // --------------------------------------------------------

    if (
      isSupabaseConfigured() &&
      hasCoords
    ) {

      try {

        const dbType =
          DISPLAY_TO_DB_TYPE[type] ||
          type ||
          null;


        const radius =
          maxDistance > 0
            ? maxDistance
            : 40;


        const {
          data: rpcFacilities,
          error: rpcError

        } =
          await supabase.rpc(

            'get_nearby_facilities',

            {

              user_lat: pLat,

              user_lng: pLng,

              radius_km:
                radius,

              facility_filter:
                dbType,

              search_query:
                search.trim() ||
                null,

            }
          );


        if (
          !rpcError &&

          Array.isArray(
            rpcFacilities
          ) &&

          rpcFacilities.length > 0
        ) {


          return rpcFacilities.map(
            f => {

              const mapped = {

                ...f,

                id: f.id,

                latitude:
                  Number(f.lat),

                longitude:
                  Number(f.lng),

                type:
                  DB_TO_DISPLAY_TYPE[
                    f.type
                  ] ||
                  f.type,

                emergencyAvailable:
                  f.emergency_available ??
                  true,

                distanceKm:
                  f.distance_km != null

                    ? Number(
                        f.distance_km
                      )

                    : calculateDistanceKm(
                        pLat,
                        pLng,
                        f.lat,
                        f.lng
                      ),

                phone:
                  f.phone ||
                  '+91 1800-180-1104',

                address:
                  f.address ||
                  `${f.name}, ${f.district || ''}`,
              };


              liveOsmCache.set(
                f.id,
                mapped
              );


              return mapped;
            }
          );
        }

      } catch (rpcEx) {

        console.warn(
          'Supabase nearby facilities RPC failed.',
          rpcEx
        );
      }
    }


    // --------------------------------------------------------
    // SUPABASE TABLE / MOCK
    // --------------------------------------------------------

    let data;


    if (
      isSupabaseConfigured()
    ) {

      try {

        data =
          await getDbFacilities();

      } catch (err) {

        console.warn(
          'Supabase facilities failed.',
          err
        );

        data =
          MOCK_FACILITIES;
      }

    } else {

      data =
        MOCK_FACILITIES;
    }


    if (
      !data ||
      data.length === 0
    ) {

      data =
        MOCK_FACILITIES;
    }


    let result =
      data.map(
        f => {

          const latVal =
            f.latitude ??
            (
              f.lat != null
                ? Number(f.lat)
                : null
            );


          const lngVal =
            f.longitude ??
            (
              f.lng != null
                ? Number(f.lng)
                : null
            );


          return {

            ...f,

            id:
              f.id ||
              f._id,

            latitude:
              latVal,

            longitude:
              lngVal,

            type:
              DB_TO_DISPLAY_TYPE[
                f.type
              ] ||
              f.type,

            emergencyAvailable:
              f.emergencyAvailable ??
              f.emergency_available ??
              false,

            distanceKm:

              hasCoords &&

              latVal != null &&

              lngVal != null

                ? calculateDistanceKm(
                    pLat,
                    pLng,
                    latVal,
                    lngVal
                  )

                : null
          };
        }
      );


    // Search
    if (
      search.trim()
    ) {

      const q =
        search
          .trim()
          .toLowerCase();


      result =
        result.filter(
          f =>

            f.name
              ?.toLowerCase()
              .includes(q) ||

            f.village
              ?.toLowerCase()
              .includes(q) ||

            f.district
              ?.toLowerCase()
              .includes(q) ||

            f.state
              ?.toLowerCase()
              .includes(q) ||

            f.address
              ?.toLowerCase()
              .includes(q) ||

            f.services
              ?.some(
                s =>
                  s
                    .toLowerCase()
                    .includes(q)
              )
        );
    }


    // Type
    if (type) {

      result =
        result.filter(
          f =>
            f.type === type
        );
    }


    // District
    if (district) {

      result =
        result.filter(
          f =>
            f.district === district
        );
    }


    // Emergency
    if (emergency) {

      result =
        result.filter(
          f =>
            f.emergencyAvailable
        );
    }


    // Distance
    if (
      maxDistance > 0 &&
      hasCoords &&
      !search.trim()
    ) {

      result =
        result.filter(
          f =>
            f.distanceKm == null ||
            f.distanceKm <=
              maxDistance
        );
    }


    // Sort by distance
    if (hasCoords) {

      result.sort(
        (a, b) => {

          if (
            a.distanceKm == null
          ) {
            return 1;
          }

          if (
            b.distanceKm == null
          ) {
            return -1;
          }

          return (
            a.distanceKm -
            b.distanceKm
          );
        }
      );
    }


    return result;
  },


  // ----------------------------------------------------------
  // GET LIVE OSM FACILITIES
  // ----------------------------------------------------------

  getLive: async (
    params = {}
  ) => {

    const {

      lat,

      lng,

      radius = 15000,

      maxDistance = 0

    } = params;


    const pLat =
      parseFloat(lat);


    const pLng =
      parseFloat(lng);


    if (
      isNaN(pLat) ||
      isNaN(pLng)
    ) {

      throw new Error(
        'Valid lat and lng are required for live OpenStreetMap search.'
      );
    }


    let facilities = [];


    // Express live endpoint

    if (
      import.meta.env.VITE_API_URL
    ) {

      try {

        const response =
          await api.get(
            '/facilities/live',
            {

              params: {

                lat: pLat,

                lng: pLng,

                radius
              }
            }
          );


        if (
          response.data?.facilities
        ) {

          facilities =
            response.data.facilities;
        }

      } catch (err) {

        console.warn(
          'Backend live facility lookup failed.',
          err
        );
      }
    }


    // Direct OSM fallback

    if (
      facilities.length === 0
    ) {

      try {

        const raw =
          await fetchDirectOverpass(
            pLat,
            pLng,
            radius
          );


        facilities =
          raw
            .map(
              f => ({

                ...f,

                distanceKm:
                  calculateDistanceKm(
                    pLat,
                    pLng,
                    f.latitude,
                    f.longitude
                  )
              })
            )

            .sort(
              (a, b) =>
                a.distanceKm -
                b.distanceKm
            );

      } catch (e) {

        console.warn(
          'Overpass fetch failed:',
          e
        );
      }
    }


    facilities.forEach(
      f => {

        liveOsmCache.set(
          f.id,
          f
        );

        liveOsmCache.set(
          f._id,
          f
        );
      }
    );


    if (
      maxDistance > 0
    ) {

      facilities =
        facilities.filter(
          f =>
            f.distanceKm == null ||
            f.distanceKm <=
              maxDistance
        );
    }


    return facilities;
  },


  // ----------------------------------------------------------
  // GET FACILITY BY ID
  // ----------------------------------------------------------

  getById: async (
    id
  ) => {


    // Live OSM cache

    if (
      liveOsmCache.has(id)
    ) {

      const fac =
        liveOsmCache.get(id);


      return {

        facility: fac,

        doctors: []
      };
    }


    // Express backend

    if (
      import.meta.env.VITE_API_URL
    ) {

      try {

        const res =
          await api.get(
            `/facilities/${id}`
          );


        if (
          res.data?.facility
        ) {

          return {

            facility:
              res.data.facility,

            doctors:
              res.data.doctors ||
              []
          };
        }

      } catch (err) {

        console.warn(
          'Backend facility details failed.',
          err
        );
      }
    }


    // Supabase

    if (
      isSupabaseConfigured()
    ) {

      try {

        const [
          fac,
          docs
        ] =
          await Promise.all([

            getDbFacilityById(
              id
            ),

            getDbDoctors(
              id
            )

          ]);


        if (fac) {

          const formattedFac = {

            ...fac,

            latitude:
              fac.latitude ??
              (
                fac.lat != null
                  ? Number(
                      fac.lat
                    )
                  : null
              ),

            longitude:
              fac.longitude ??
              (
                fac.lng != null
                  ? Number(
                      fac.lng
                    )
                  : null
              ),

            type:
              DB_TO_DISPLAY_TYPE[
                fac.type
              ] ||
              fac.type,

            emergencyAvailable:
              fac.emergencyAvailable ??
              fac.emergency_available ??
              true,
          };


          const formattedDocs =
            (docs || []).map(
              d => ({

                id: d.id,

                name:
                  d.profiles
                    ?.full_name ||
                  'Dr. Unknown',

                specialization:
                  d.specialization,

                isAvailable:
                  d.is_available,

                phone:
                  d.profiles
                    ?.phone,
              })
            );


          return {

            facility:
              formattedFac,

            doctors:
              formattedDocs
          };
        }

      } catch (err) {

        console.warn(
          'Supabase facility details failed.',
          err
        );
      }
    }


    // Mock fallback

    const fac =
      MOCK_FACILITIES.find(
        f =>
          f.id === id ||
          f._id === id
      ) ||
      null;


    const docs =
      MOCK_DOCTORS_BY_FACILITY[
        id
      ] ||
      [];


    return {

      facility: fac,

      doctors: docs
    };
  }
};


// ============================================================
// LOCAL APPOINTMENT STORAGE
// ============================================================

const STORAGE_KEY =
  'careconnect_appointments';


function getStoredAppointments() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (saved) {

      return JSON.parse(
        saved
      );
    }

  } catch (err) {

    console.warn(
      'Unable to read appointments from localStorage.',
      err
    );
  }


  return MOCK_APPOINTMENTS;
}


function saveStoredAppointments(
  appts
) {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        appts
      )
    );

  } catch (err) {

    console.warn(
      'Unable to save appointments to localStorage.',
      err
    );
  }
}


// ============================================================
// CONSULTATION MODE HELPERS
// ============================================================

/*
IMPORTANT:

React/UI currently uses:

    in-person

Supabase consultation_mode enum expects:

    in_person

This helper converts the UI value before
sending it to Supabase.
*/

function toDbConsultationMode(
  mode
) {

  if (
    !mode ||
    mode === 'in-person' ||
    mode === 'in_person'
  ) {

    return 'in_person';
  }


  return mode;
}


/*
When reading from Supabase,
convert in_person back to the
UI-friendly in-person value.
*/

function toDisplayConsultationMode(
  mode
) {

  if (
    !mode ||
    mode === 'in_person'
  ) {

    return 'in-person';
  }


  return mode;
}


// ============================================================
// APPOINTMENT SERVICE
// ============================================================

export const appointmentService = {


  // ----------------------------------------------------------
  // GET ALL APPOINTMENTS
  // ----------------------------------------------------------

  getAll: async () => {


    // Supabase first

    if (
      isSupabaseConfigured()
    ) {

      try {

        const dbAppts =
          await getDbAppointments();


        if (
          dbAppts &&
          dbAppts.length > 0
        ) {

          return dbAppts.map(
            a => {


              const dt =
                a.scheduled_at
                  ? new Date(
                      a.scheduled_at
                    )
                  : null;


              return {

                ...a,

                _id:
                  a.id,

                date:
                  dt
                    ? dt
                        .toISOString()
                        .split('T')[0]
                    : '',

                time:
                  dt
                    ? dt.toLocaleTimeString(
                        'en-IN',
                        {

                          hour:
                            '2-digit',

                          minute:
                            '2-digit',

                          hour12:
                            false
                        }
                      )
                    : '',

                timeSlot:
                  dt
                    ? dt.toLocaleTimeString(
                        'en-IN',
                        {

                          hour:
                            '2-digit',

                          minute:
                            '2-digit',

                          hour12:
                            false
                        }
                      )
                    : '',


                doctor:
                  a.doctors
                    ?.profiles
                    ?.full_name ||

                  (
                    a.doctors
                      ?.specialization

                      ? `Dr. (${a.doctors.specialization})`

                      : 'Attending Physician'
                  ),


                doctorId:
                  a.doctors?.id,


                facility:
                  a.facilities
                    ?.name ||
                  'CareConnect Facility',


                facilityId:
                  a.facilities?.id,


                type:
                  'OPD Consultation',


                consultationType:
                  toDisplayConsultationMode(
                    a.mode
                  ),


                mode:
                  toDisplayConsultationMode(
                    a.mode
                  ),


                symptoms:
                  a.reason ||
                  '',


                queueNo:
                  a.queues?.[0]
                    ?.queue_number ||
                  'A-01',


                queue_no:
                  a.queues?.[0]
                    ?.queue_number ||
                  'A-01',
              };
            }
          );
        }

      } catch (e) {

        console.error(
          'Supabase appointment fetch failed:',
          e
        );

        throw e;
      }
    }


    // Express backend

    if (
      import.meta.env.VITE_API_URL
    ) {

      try {

        const res =
          await api.get(
            '/appointments'
          );


        if (
          res.data
            ?.appointments
        ) {

          return (
            res.data.appointments
          );
        }

      } catch (err) {

        console.warn(
          'Backend appointment fetch failed.',
          err
        );
      }
    }


    // Local fallback

    return getStoredAppointments();
  },


  // ----------------------------------------------------------
  // BOOK APPOINTMENT
  // ----------------------------------------------------------

  book: async (
    appointmentData
  ) => {


    // Supabase first

    if (
      isSupabaseConfigured()
    ) {

      try {


        // Build appointment datetime

        let scheduledAt =
          new Date()
            .toISOString();


        if (
          appointmentData.date &&
          appointmentData.timeSlot
        ) {

          scheduledAt =
            new Date(
              `${appointmentData.date}T${appointmentData.timeSlot}:00`
            ).toISOString();

        } else if (
          appointmentData.date
        ) {

          scheduledAt =
            new Date(
              `${appointmentData.date}T09:00:00`
            ).toISOString();
        }


        // ====================================================
        // IMPORTANT FIX
        // ====================================================

        const normalizedMode =
          toDbConsultationMode(
            appointmentData
              .consultationType
          );


        console.log(
          'Booking appointment:',
          {

            facilityId:
              appointmentData
                .facilityId,

            doctorId:
              appointmentData
                .doctorId,

            scheduledAt,

            uiMode:
              appointmentData
                .consultationType,

            databaseMode:
              normalizedMode
          }
        );


        // Send correct enum value
        // to Supabase

        const res =
          await dbBookAppointment({

            facilityId:
              appointmentData
                .facilityId,

            doctorId:
              appointmentData
                .doctorId,

            scheduledAt:

              scheduledAt,

            // FIX:
            // "in-person"
            // becomes
            // "in_person"

            mode:
              normalizedMode,

            reason:
              appointmentData
                .symptoms ||
              'General Consultation',
          });


        const queueNo =
          res?.queue_number ||
          null;


        const appointmentId =
          res?.appointment_id ||
          `a-${Date.now()}`;


        const newAppt = {

          id:
            appointmentId,

          _id:
            appointmentId,


          date:
            appointmentData.date,


          time:
            appointmentData.timeSlot,


          timeSlot:
            appointmentData.timeSlot,


          doctor:
            appointmentData
              .doctorName ||
            'Attending Physician',


          doctorId:
            appointmentData
              .doctorId,


          facility:
            appointmentData
              .facilityName ||
            'CareConnect Facility',


          facilityId:
            appointmentData
              .facilityId,


          type:
            'OPD Consultation',


          // Keep UI value friendly

          consultationType:
            toDisplayConsultationMode(
              normalizedMode
            ),


          mode:
            toDisplayConsultationMode(
              normalizedMode
            ),


          symptoms:
            appointmentData
              .symptoms ||
            '',


          referralId:
            appointmentData
              .referralId ||
            null,


          referralDept:
            appointmentData
              .referralDept ||
            null,


          isReferral:
            !!appointmentData
              .referralId,


          status:
            'confirmed',


          queueNo:
            queueNo,


          queue_no:
            queueNo,


          createdAt:
            new Date()
              .toISOString()
        };


        // Save local copy too

        const current =
          getStoredAppointments();


        saveStoredAppointments([
          newAppt,
          ...current
        ]);


        return newAppt;


      } catch (err) {

        console.error(
          'Supabase appointment booking failed:',
          err
        );

        throw err;
      }
    }


    // --------------------------------------------------------
    // EXPRESS BACKEND
    // --------------------------------------------------------

    try {

      const backendData = {

        ...appointmentData,

        consultationType:
          toDbConsultationMode(
            appointmentData
              .consultationType
          ),

        mode:
          toDbConsultationMode(
            appointmentData
              .consultationType
          )
      };


      const res =
        await api.post(
          '/appointments',
          backendData
        );


      if (
        res.data?.appointment
      ) {

        const current =
          getStoredAppointments();


        saveStoredAppointments([

          res.data
            .appointment,

          ...current

        ]);


        return (
          res.data.appointment
        );
      }

    } catch (err) {

      console.warn(
        'Backend booking failed. Using local fallback.',
        err
      );
    }


    // --------------------------------------------------------
    // LOCAL FALLBACK
    // --------------------------------------------------------

    const current =
      getStoredAppointments();


    const queueNo =
      `A-0${current.length + 31}`;


    const newAppt = {

      id:
        `a-${Date.now()}`,

      _id:
        `a-${Date.now()}`,


      date:
        appointmentData.date,


      time:
        appointmentData.timeSlot,


      timeSlot:
        appointmentData.timeSlot,


      doctor:
        appointmentData
          .doctorName ||
        'Attending Physician',


      doctorId:
        appointmentData
          .doctorId,


      facility:
        appointmentData
          .facilityName ||
        'CareConnect Facility',


      facilityId:
        appointmentData
          .facilityId,


      type:
        'OPD Consultation',


      consultationType:
        toDisplayConsultationMode(
          appointmentData
            .consultationType
        ),


      mode:
        toDisplayConsultationMode(
          appointmentData
            .consultationType
        ),


      symptoms:
        appointmentData
          .symptoms ||
        '',


      referralId:
        appointmentData
          .referralId ||
        null,


      referralDept:
        appointmentData
          .referralDept ||
        null,


      isReferral:
        !!appointmentData
          .referralId,


      status:
        'confirmed',


      queueNo,


      queue_no:
        queueNo,


      createdAt:
        new Date()
          .toISOString()
    };


    saveStoredAppointments([

      newAppt,

      ...current

    ]);


    return newAppt;
  },


  // ----------------------------------------------------------
  // CANCEL APPOINTMENT
  // ----------------------------------------------------------

  cancel: async (
    id
  ) => {


    // Supabase

    if (
      isSupabaseConfigured()
    ) {

      try {

        await dbCancelAppointment(
          id
        );


        return {

          id,

          status:
            'cancelled'
        };

      } catch (e) {

        console.error(
          'Supabase cancellation failed:',
          e
        );

        throw e;
      }
    }


    // Express backend

    try {

      const res =
        await api.patch(
          `/appointments/${id}/cancel`
        );


      if (
        res.data
          ?.appointment
      ) {

        const current =
          getStoredAppointments();


        const updated =
          current.map(
            a =>

              (
                a.id === id ||
                a._id === id
              )

                ? {

                    ...a,

                    status:
                      'cancelled'
                  }

                : a
          );


        saveStoredAppointments(
          updated
        );


        return (
          res.data.appointment
        );
      }

    } catch (err) {

      console.warn(
        'Backend cancellation failed. Using local fallback.',
        err
      );
    }


    // Local fallback

    const current =
      getStoredAppointments();


    const updated =
      current.map(
        a =>

          (
            a.id === id ||
            a._id === id
          )

            ? {

                ...a,

                status:
                  'cancelled'
              }

            : a
      );


    saveStoredAppointments(
      updated
    );


    return {

      id,

      status:
        'cancelled'
    };
  }
};