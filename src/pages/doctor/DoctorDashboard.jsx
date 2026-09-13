import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppLayout from '../../components/layout/AppLayout'
import { KPICard } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Misc'
import { supabase } from '../../lib/supabase'

import {
  updateAppointmentStatus,
  updateQueueStatus,
} from '../../lib/db'

import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
  Play,
  Eye,
  Loader2,
} from 'lucide-react'


const PRIORITY_META = {
  emergency: {
    variant: 'critical',
    label: 'Emergency',
  },

  high: {
    variant: 'critical',
    label: 'High Priority',
  },

  medium: {
    variant: 'warning',
    label: 'Medium',
  },

  low: {
    variant: 'success',
    label: 'Low',
  },
}


/* ==========================
   AGE CALCULATION
========================== */

function getAge(dob) {
  if (!dob) return '—'

  const birthDate = new Date(dob)

  if (Number.isNaN(birthDate.getTime())) {
    return '—'
  }

  const today = new Date()

  let age =
    today.getFullYear() -
    birthDate.getFullYear()

  const monthDiff =
    today.getMonth() -
    birthDate.getMonth()

  if (
    monthDiff < 0 ||
    (
      monthDiff === 0 &&
      today.getDate() < birthDate.getDate()
    )
  ) {
    age--
  }

  return age
}


/* ==========================
   WAITING TIME
========================== */

function getWaitingTime(createdAt, status) {

  if (!createdAt) {
    return '—'
  }

  if (status === 'in_consultation') {
    return 'In consultation'
  }

  const started =
    new Date(createdAt).getTime()

  if (Number.isNaN(started)) {
    return '—'
  }

  const minutes =
    Math.max(
      0,
      Math.floor(
        (Date.now() - started) / 60000
      )
    )

  if (minutes < 60) {
    return `${minutes} mins`
  }

  const hours =
    Math.floor(minutes / 60)

  const remaining =
    minutes % 60

  return `${hours}h ${remaining}m`
}


/* ==========================
   QUEUE ROW
========================== */

function PatientQueueRow({
  patient,
  onStart,
  onView,
  startingId,
}) {

  const priorityMeta =
    PRIORITY_META[patient.priority] ||
    PRIORITY_META.medium

  const isStarting =
    startingId === patient.id

  const isActive =
    patient.queue_status ===
    'in_consultation'


  return (

    <tr
      className="
        border-b
        border-border
        hover:bg-bg
        transition-colors
      "
    >

      {/* QUEUE NUMBER */}

      <td className="px-4 py-3">

        <span
          className="
            font-mono
            font-bold
            text-teal
            text-sm
          "
        >
          {patient.queue_no}
        </span>

      </td>


      {/* PATIENT */}

      <td className="px-4 py-3">

        <div>

          <p
            className="
              font-semibold
              text-navy
              text-sm
            "
          >
            {patient.name}
          </p>


          <p
            className="
              text-xs
              text-muted
            "
          >

            {patient.age} yrs

            {' · '}

            {patient.reason ||
              'General consultation'}

          </p>

        </div>

      </td>


      {/* PRIORITY */}

      <td className="px-4 py-3">

        <Badge
          variant={priorityMeta.variant}
        >

          {priorityMeta.label}

        </Badge>

      </td>


      {/* WAITING */}

      <td className="px-4 py-3">

        <span
          className="
            text-xs
            text-muted
            flex
            items-center
            gap-1
          "
        >

          <Clock className="w-3 h-3" />

          {patient.waiting_since}

        </span>

      </td>


      {/* ACTIONS */}

      <td className="px-4 py-3">

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <Button
            size="sm"
            className="bg-teal text-white"
            onClick={() =>
              onStart(patient)
            }
            disabled={
              isStarting ||
              isActive
            }
          >

            {
              isStarting
                ? (
                  <Loader2
                    className="
                      w-3
                      h-3
                      animate-spin
                    "
                  />
                )
                : (
                  <Play
                    className="
                      w-3
                      h-3
                    "
                  />
                )
            }

            {
              isActive
                ? 'Active'
                : 'Start'
            }

          </Button>


          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onView(patient)
            }
          >

            <Eye className="w-3 h-3" />

          </Button>

        </div>

      </td>

    </tr>
  )
}


/* ============================================================
   MAIN DASHBOARD COMPONENT
============================================================ */

export default function DoctorDashboard() {

  const {
    user,
    demoMode,
  } = useAuth()

  const navigate =
    useNavigate()


  /* ==========================
     DOCTOR NAME / GREETING
  ========================== */

  const name =
    user?.name ||
    'Doctor'

  const hour =
    new Date().getHours()

  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening'


  /* ==========================
     STATES
  ========================== */

  const [
    doctor,
    setDoctor,
  ] = useState(null)


  const [
    appointments,
    setAppointments,
  ] = useState([])


  const [
    queue,
    setQueue,
  ] = useState([])


  const [
    pendingReferrals,
    setPendingReferrals,
  ] = useState(0)


  const [
    emergencyCount,
    setEmergencyCount,
  ] = useState(0)


  const [
    loading,
    setLoading,
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState('')


  const [
    activePatient,
    setActivePatient,
  ] = useState(null)


  const [
    startingId,
    setStartingId,
  ] = useState(null)


  const [
    ,
    setClockTick,
  ] = useState(0)


  /* ============================================================
     LOAD DASHBOARD
  ============================================================ */

  const loadDashboard =
    useCallback(async () => {

      /* --------------------------
         REAL LOGIN REQUIRED
      -------------------------- */

      if (!user?.id || demoMode) {

        setDoctor(null)

        setAppointments([])

        setQueue([])

        setPendingReferrals(0)

        setEmergencyCount(0)

        setLoading(false)

        return
      }


      setError('')


      try {

        /* ======================================================
           GET LOGGED IN DOCTOR
        ====================================================== */

        const {
          data: doctorData,
          error: doctorError,
        } = await supabase

          .from('doctors')

          .select(`
            id,
            facility_id,
            specialization,
            is_available,

            facilities:facility_id (
              id,
              name,
              type
            )
          `)

          .eq(
            'profile_id',
            user.id
          )

          .single()


        if (doctorError) {
          throw doctorError
        }


        setDoctor(doctorData)


        /* ======================================================
           TODAY START / END
        ====================================================== */

        const start =
          new Date()

        start.setHours(
          0,
          0,
          0,
          0
        )


        const end =
          new Date(start)

        end.setDate(
          end.getDate() + 1
        )


        /* ======================================================
           FETCH ALL DASHBOARD DATA
        ====================================================== */

        const [

          appointmentsResult,

          queueResult,

          referralsResult,

          emergenciesResult,

        ] = await Promise.all([


          /* ==============================
             TODAY APPOINTMENTS
          ============================== */

          supabase

            .from('appointments')

            .select(`
              id,
              scheduled_at,
              created_at,
              facility_id,
              status,
              reason,
              mode,

              patients:patient_id (
                id,
                patient_code,
                dob,
                is_high_risk,

                profiles:profile_id (
                  full_name,
                  phone
                )
              )
            `)

            .eq(
              'doctor_id',
              doctorData.id
            )

            .gte(
              'scheduled_at',
              start.toISOString()
            )

            .lt(
              'scheduled_at',
              end.toISOString()
            )

            .order(
              'scheduled_at',
              {
                ascending: true,
              }
            ),


          /* ==============================
             QUEUE TABLE
          ============================== */

          supabase

            .from('queues')

            .select(`
              id,
              queue_number,
              position,
              status,
              called_at,
              started_at,
              created_at,

              appointments:appointment_id (
                id,
                doctor_id,
                status,
                reason,
                scheduled_at,

                patients:patient_id (
                  id,
                  patient_code,
                  dob,
                  is_high_risk,

                  profiles:profile_id (
                    full_name,
                    phone
                  )
                )
              )
            `)

            .eq(
              'facility_id',
              doctorData.facility_id
            )

            .gte(
              'created_at',
              start.toISOString()
            )

            .in(
              'status',
              [
                'waiting',
                'in_consultation',
                'emergency',
              ]
            )

            .order(
              'position',
              {
                ascending: true,
              }
            ),


          /* ==============================
             REFERRALS
          ============================== */

          supabase

            .from('referrals')

            .select(
              'id',
              {
                count: 'exact',
                head: true,
              }
            )

            .eq(
              'referring_doctor',
              doctorData.id
            )

            .in(
              'status',
              [
                'created',
                'pending',
              ]
            ),


          /* ==============================
             EMERGENCY CASES
          ============================== */

          supabase

            .from('emergency_cases')

            .select(
              'id',
              {
                count: 'exact',
                head: true,
              }
            )

            .eq(
              'facility_id',
              doctorData.facility_id
            )

            .in(
              'status',
              [
                'active',
                'escalated',
              ]
            ),
        ])


        /* ======================================================
           ERROR CHECKING
        ====================================================== */

        if (
          appointmentsResult.error
        ) {
          throw appointmentsResult.error
        }


        if (
          queueResult.error
        ) {
          throw queueResult.error
        }


        if (
          referralsResult.error
        ) {
          throw referralsResult.error
        }


        if (
          emergenciesResult.error
        ) {
          throw emergenciesResult.error
        }


        /* ======================================================
           SAVE DATA
        ====================================================== */

        setAppointments(
          appointmentsResult.data ||
          []
        )


        /*
          IMPORTANT FIX

          Only queue records belonging
          to this doctor are stored.
        */

        setQueue(

          (
            queueResult.data ||
            []
          ).filter(

            item =>
              item
                .appointments
                ?.doctor_id ===
              doctorData.id
          )
        )


        setPendingReferrals(
          referralsResult.count ||
          0
        )


        setEmergencyCount(
          emergenciesResult.count ||
          0
        )

      }

      catch (err) {

        console.error(
          'Doctor dashboard load failed:',
          err
        )


        setError(
          err?.message ||
          'Unable to load live dashboard data.'
        )
      }

      finally {

        setLoading(false)
      }

    }, [
      user?.id,
      demoMode,
    ])


  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {

    setLoading(true)

    loadDashboard()

  }, [
    loadDashboard,
  ])


  /* ============================================================
     UPDATE WAITING TIME EVERY MINUTE
  ============================================================ */

  useEffect(() => {

    const timer =
      setInterval(
        () => {

          setClockTick(
            tick =>
              tick + 1
          )

        },
        60000
      )


    return () =>
      clearInterval(timer)

  }, [])


  /* ============================================================
     SUPABASE REALTIME
  ============================================================ */

  useEffect(() => {

    if (
      !doctor?.id ||
      !doctor?.facility_id ||
      demoMode
    ) {
      return undefined
    }


    const channel =
      supabase

        .channel(
          `doctor-dashboard:${doctor.id}`
        )


        /* APPOINTMENTS */

        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter:
              `doctor_id=eq.${doctor.id}`,
          },
          loadDashboard
        )


        /* QUEUES */

        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'queues',
            filter:
              `facility_id=eq.${doctor.facility_id}`,
          },
          loadDashboard
        )


        /* REFERRALS */

        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'referrals',
            filter:
              `referring_doctor=eq.${doctor.id}`,
          },
          loadDashboard
        )


        /* EMERGENCY */

        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'emergency_cases',
            filter:
              `facility_id=eq.${doctor.facility_id}`,
          },
          loadDashboard
        )


        .subscribe()


    return () => {

      supabase
        .removeChannel(channel)

    }

  }, [
    doctor?.id,
    doctor?.facility_id,
    demoMode,
    loadDashboard,
  ])


  /* ============================================================
     BUILD TODAY'S QUEUE
     
     MAIN FIX:
     APPOINTMENTS WILL SHOW EVEN IF
     NO QUEUE RECORD EXISTS
  ============================================================ */

  const queuePatients =
    useMemo(() => {


      /*
        Convert real queue records
        into appointment => queue map
      */

      const queueByAppointment =
        new Map(

          queue

            .filter(
              item =>
                item
                  .appointments
                  ?.id
            )

            .map(
              item => [

                item
                  .appointments
                  .id,

                item,

              ]
            )
        )


      /*
        Get appointments that
        are still active.
      */

      const activeAppointments =
        appointments.filter(
          appointment =>
            String(appointment.status || '').toLowerCase() !==
            'completed'
        )


      /*
        Build queue using
        appointments as base.
      */

      return activeAppointments.map(

        (
          appointment,
          index
        ) => {


          /*
            Check whether this
            appointment already
            has queue entry.
          */

          const item =
            queueByAppointment.get(
              appointment.id
            )


          const patient =
            appointment.patients


          /* ======================
             PRIORITY
          ====================== */

          let priority =
            'medium'


          if (
            item?.status ===
            'emergency'
          ) {

            priority =
              'emergency'

          }

          else if (
            patient
              ?.is_high_risk
          ) {

            priority =
              'high'

          }

          else if (
            (
              item?.position ??
              index + 1
            ) > 3
          ) {

            priority =
              'low'

          }


          /* ======================
             QUEUE STATUS
          ====================== */

          const queueStatus =

            item?.status ||

            (
              appointment.status ===
              'in_progress'

                ? 'in_consultation'

                : 'waiting'
            )


          /* ======================
             WAITING FROM
          ====================== */

          const waitingFrom =

            item?.created_at ||

            appointment.created_at ||

            appointment.scheduled_at


          /* ======================
             RETURN QUEUE PATIENT
          ====================== */

          return {

            /*
              Queue ID if available.
              Otherwise temporary ID.
            */

            id:
              item?.id ||
              `appointment-${appointment.id}`,


            /*
              Real queue database ID.
            */

            queue_id:
              item?.id ||
              null,


            /*
              Appointment ID.
            */

            appointment_id:
              appointment.id,


            /*
              Patient ID.
            */

            patient_id:
              patient?.id,


            /*
              Real queue number
              or generated number.
            */

            queue_no:

              item
                ?.queue_number ||

              `A-${String(
                index + 1
              ).padStart(
                3,
                '0'
              )}`,


            queue_status:
              queueStatus,


            /*
              Patient Name
            */

            name:

              patient
                ?.profiles
                ?.full_name ||

              'Patient',


            /*
              Patient Age
            */

            age:
              getAge(
                patient?.dob
              ),


            /*
              Appointment Reason
            */

            reason:
              appointment.reason,


            /*
              Priority
            */

            priority,


            /*
              Dynamic waiting time
            */

            waiting_since:

              getWaitingTime(
                waitingFrom,
                queueStatus
              ),
          }
        }
      )

    }, [
      appointments,
      queue,
    ])


  /* ============================================================
     DASHBOARD COUNTS
  ============================================================ */

  const stats =
    useMemo(() => {

      const totalToday =
        appointments.length

      const completed =
        appointments.filter(
          item =>
            String(item.status || '').toLowerCase() ===
            'completed'
        ).length

      // Waiting = Total Today - Completed
      const waiting =
        Math.max(
          totalToday - completed,
          0
        )

      const highRisk =
        appointments.filter(
          item =>
            item
              .patients
              ?.is_high_risk
        ).length

      const emergency =
        emergencyCount +
        queuePatients.filter(
          item =>
            item.queue_status ===
            'emergency'
        ).length

      return {
        totalToday,
        waiting,
        completed,
        highRisk,
        emergency,
      }

    }, [
      appointments,
      queuePatients,
      emergencyCount,
    ])



  /* ============================================================
     START CONSULTATION
  ============================================================ */

  async function handleStart(
    patient
  ) {

    if (
      !patient
        ?.appointment_id
    ) {
      return
    }


    setStartingId(
      patient.id
    )


    setError('')


    try {

      /*
        Always update
        appointment.
      */

      const updates = [

        updateAppointmentStatus(
          patient.appointment_id,
          'in_progress'
        ),

      ]


      /*
        Update queue only
        when queue row exists.
      */

      if (
        patient.queue_id
      ) {

        updates.push(

          updateQueueStatus(
            patient.queue_id,
            'in_consultation'
          )

        )
      }


      await Promise.all(
        updates
      )


      setActivePatient({

        ...patient,

        queue_status:
          'in_consultation',

      })


      /*
        Refresh dashboard.
      */

      await loadDashboard()

    }

    catch (err) {

      console.error(
        'Unable to start consultation:',
        err
      )


      setError(

        err?.message ||

        'Unable to start consultation.'
      )
    }

    finally {

      setStartingId(null)
    }
  }


  /* ============================================================
     VIEW PATIENT
  ============================================================ */

  function handleView(
    patient
  ) {

    if (
      patient?.patient_id
    ) {

      navigate(
        '/doctor/patients'
      )
    }
  }


  /* ============================================================
     FACILITY NAME
  ============================================================ */

  const facilityName =

    doctor
      ?.facilities
      ?.name ||

    'Assigned Facility'


  /* ============================================================
     UI
  ============================================================ */

  return (

    <AppLayout role="doctor">

      <div
        className="
          p-4
          md:p-6
          space-y-6
        "
      >


        {/* ====================================================
            HEADER
        ==================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            flex-wrap
          "
        >

          <div>

            <h1
              className="
                text-2xl
                font-bold
                text-navy
              "
            >

              {greeting},
              {' '}
              {name}
              {' '}
              👋

            </h1>


            <p
              className="
                text-muted
                text-sm
              "
            >

              {facilityName}

              {' · '}

              {
                new Date()
                  .toLocaleDateString(
                    'en-IN',
                    {
                      weekday:
                        'long',

                      day:
                        'numeric',

                      month:
                        'long',
                    }
                  )
              }

            </p>

          </div>


          {/* CLINIC STATUS */}

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <div

              className={`
                flex
                items-center
                gap-1.5
                px-3
                py-1.5
                rounded-full
                border
                text-xs
                font-semibold

                ${
                  doctor
                    ?.is_available

                    ? `
                      bg-success-bg
                      border-success/20
                      text-success
                    `

                    : `
                      bg-bg
                      border-border
                      text-muted
                    `
                }
              `}
            >

              <span

                className={`
                  w-2
                  h-2
                  rounded-full

                  ${
                    doctor
                      ?.is_available

                      ? `
                        bg-success
                        animate-pulse
                      `

                      : `
                        bg-muted
                      `
                  }
                `}
              />


              {
                doctor
                  ?.is_available

                  ? 'Clinic Open'

                  : 'Clinic Status Unavailable'
              }

            </div>

          </div>

        </div>


        {/* ====================================================
            DEMO MODE MESSAGE
        ==================================================== */}

        {
          demoMode && (

            <Alert
              type="info"
              title="
                Live dashboard requires
                a real doctor login
              "
            >

              Demo mode is no longer
              using hard-coded patient
              data. Sign in with a
              doctor account connected
              to Supabase to see live
              appointments, queues,
              referrals and follow-ups.

            </Alert>
          )
        }


        {/* ====================================================
            ERROR MESSAGE
        ==================================================== */}

        {
          error && (

            <Alert
              type="critical"
              title="
                Dashboard data could
                not be refreshed
              "
            >

              {error}

            </Alert>
          )
        }


        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <div
          className="
            grid
            grid-cols-2
            md:grid-cols-3
            lg:grid-cols-5
            gap-4
          "
        >


          <KPICard

            title="Total Today"

            value={
              loading
                ? '—'
                : stats.totalToday
            }

            icon={Users}

            color="navy"
          />


          <KPICard

            title="Waiting"

            value={
              loading
                ? '—'
                : stats.waiting
            }

            icon={Clock}

            color="warning"
          />


          <KPICard

            title="Completed"

            value={
              loading
                ? '—'
                : stats.completed
            }

            icon={
              CheckCircle2
            }

            color="success"
          />


          <KPICard

            title="High Risk"

            value={
              loading
                ? '—'
                : stats.highRisk
            }

            icon={
              AlertCircle
            }

            color="critical"
          />


          <KPICard

            title="Emergency"

            value={
              loading
                ? '—'
                : stats.emergency
            }

            icon={
              AlertCircle
            }

            color="teal"
          />





        </div>


        {/* ====================================================
            ACTIVE CONSULTATION
        ==================================================== */}

        {
          activePatient && (

            <Alert

              type="info"

              title={
                `Active Consultation: ${activePatient.name}`
              }
            >

              {activePatient.age}
              {' yrs — '}

              {
                activePatient.reason ||
                'General consultation'
              }

              {' — Queue: '}

              {
                activePatient.queue_no
              }

            </Alert>
          )
        }


        {/* ====================================================
            TODAY QUEUE
        ==================================================== */}

        <div>


          {/* QUEUE HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              mb-4
            "
          >

            <h2
              className="
                text-lg
                font-bold
                text-navy
              "
            >

              Today's Queue

            </h2>


            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <span
                className="
                  text-xs
                  text-muted
                "
              >

                {
                  loading

                    ? 'Loading...'

                    : `${queuePatients.length} patients waiting`
                }

              </span>


              <Button

                size="sm"

                variant="outline"

                onClick={() =>
                  navigate(
                    '/doctor/queue'
                  )
                }
              >

                Full Queue View

              </Button>

            </div>

          </div>


          {/* ==================================================
              QUEUE TABLE
          ================================================== */}

          <div
            className="
              bg-surface
              rounded-xl
              border
              border-border
              overflow-hidden
              shadow-sm
            "
          >

            <div
              className="
                overflow-x-auto
              "
            >

              <table className="w-full">


                {/* TABLE HEADER */}

                <thead>

                  <tr
                    className="
                      bg-bg
                      border-b
                      border-border
                    "
                  >

                    <th
                      className="
                        px-4
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        text-muted
                        uppercase
                        tracking-wider
                      "
                    >

                      Queue

                    </th>


                    <th
                      className="
                        px-4
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        text-muted
                        uppercase
                        tracking-wider
                      "
                    >

                      Patient

                    </th>


                    <th
                      className="
                        px-4
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        text-muted
                        uppercase
                        tracking-wider
                      "
                    >

                      Priority

                    </th>


                    <th
                      className="
                        px-4
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        text-muted
                        uppercase
                        tracking-wider
                      "
                    >

                      Waiting

                    </th>


                    <th
                      className="
                        px-4
                        py-3
                        text-left
                        text-xs
                        font-semibold
                        text-muted
                        uppercase
                        tracking-wider
                      "
                    >

                      Actions

                    </th>

                  </tr>

                </thead>


                {/* TABLE BODY */}

                <tbody>


                  {/* LOADING */}

                  {
                    loading
                      ? (

                        <tr>

                          <td
                            colSpan="5"
                            className="
                              px-4
                              py-10
                              text-center
                              text-sm
                              text-muted
                            "
                          >

                            <Loader2
                              className="
                                w-5
                                h-5
                                animate-spin
                                mx-auto
                                mb-2
                              "
                            />

                            Loading today's
                            live queue...

                          </td>

                        </tr>

                      )


                      /* EMPTY QUEUE */

                      : queuePatients.length === 0
                        ? (

                          <tr>

                            <td
                              colSpan="5"
                              className="
                                px-4
                                py-10
                                text-center
                                text-sm
                                text-muted
                              "
                            >

                              No patients are
                              currently waiting
                              in your queue.

                            </td>

                          </tr>

                        )


                        /* QUEUE ROWS */

                        : (

                          queuePatients.map(

                            patient => (

                              <PatientQueueRow

                                key={
                                  patient.id
                                }

                                patient={
                                  patient
                                }

                                onStart={
                                  handleStart
                                }

                                onView={
                                  handleView
                                }

                                startingId={
                                  startingId
                                }

                              />

                            )
                          )
                        )
                  }

                </tbody>

              </table>

            </div>

          </div>

        </div>


        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <div
          className="
            grid
            sm:grid-cols-3
            gap-4
          "
        >

          {
            [

              {
                title:
                  'Manage Queue',

                desc:
                  'Call, skip, complete patients',

                icon:
                  Users,

                href:
                  '/doctor/queue',

                color:
                  'teal',
              },


              {
                title:
                  'Patient Records',

                desc:
                  'View full clinical histories',

                icon:
                  FileText,

                href:
                  '/doctor/patients',

                color:
                  'blue',
              },


              {
                title:
                  'Pending Referrals',

                desc:
                  `${pendingReferrals} referrals awaiting action`,

                icon:
                  CheckCircle2,

                href:
                  '/doctor/referrals',

                color:
                  'warning',
              },

            ].map(

              action => (

                <button

                  key={
                    action.title
                  }

                  onClick={() =>
                    navigate(
                      action.href
                    )
                  }

                  className="
                    flex
                    items-center
                    gap-4
                    p-4
                    bg-surface
                    rounded-xl
                    border
                    border-border
                    hover:shadow-md
                    hover:-translate-y-0.5
                    transition-all
                    text-left
                  "
                >


                  <div

                    className={`
                      w-10
                      h-10
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      flex-shrink-0

                      ${
                        action.color ===
                        'teal'

                          ? `
                            bg-teal-light
                            text-teal
                          `

                          : action.color ===
                            'blue'

                            ? `
                              bg-blue-light
                              text-blue
                            `

                            : `
                              bg-warning-bg
                              text-warning
                            `
                      }
                    `}
                  >

                    <action.icon
                      className="
                        w-5
                        h-5
                      "
                    />

                  </div>


                  <div>

                    <p
                      className="
                        font-semibold
                        text-navy
                        text-sm
                      "
                    >

                      {action.title}

                    </p>


                    <p
                      className="
                        text-xs
                        text-muted
                      "
                    >

                      {action.desc}

                    </p>

                  </div>


                  <ChevronRight
                    className="
                      w-4
                      h-4
                      text-muted
                      ml-auto
                    "
                  />

                </button>

              )
            )
          }

        </div>

      </div>

    </AppLayout>
  )
}