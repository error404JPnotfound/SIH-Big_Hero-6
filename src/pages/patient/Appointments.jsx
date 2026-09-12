import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MOCK_APPOINTMENTS } from '../../lib/mockData'
import { Calendar, Clock, MapPin, Video, User, CheckCircle2, ChevronRight } from 'lucide-react'

const DOCTORS = [
  { id: 'd1', name: 'Dr. Arjun Mehta', spec: 'General Physician', facility: 'PHC Khandwa', slots: ['09:00', '09:30', '10:00', '11:00', '14:00'], next_available: 'Today' },
  { id: 'd2', name: 'Dr. Sunita Rao', spec: 'Gynaecologist', facility: 'District Hospital', slots: ['10:00', '10:30', '15:00', '15:30'], next_available: 'Tomorrow' },
  { id: 'd3', name: 'Dr. Priyanka Das', spec: 'Paediatrician', facility: 'CHC Sanawad', slots: ['09:00', '09:30', '11:00'], next_available: 'Today' },
]

const STEPS = ['Service', 'Doctor', 'Date & Time', 'Mode', 'Confirm']

function BookingWizard({ onClose }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ service: '', doctor: null, date: '', slot: '', mode: 'in-person' })
  const [booked, setBooked] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const confirmBooking = () => {
    setTimeout(() => setBooked(true), 500)
  }

  if (booked) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h3 className="text-xl font-bold text-navy mb-2">Appointment Confirmed!</h3>
        <p className="text-muted mb-6 text-sm">Your appointment has been booked successfully.</p>
        <div className="bg-bg rounded-xl p-4 text-left space-y-2 text-sm mb-6">
          <div className="flex justify-between"><span className="text-muted">Doctor</span><span className="font-medium">{form.doctor?.name}</span></div>
          <div className="flex justify-between"><span className="text-muted">Date</span><span className="font-medium">{form.date}</span></div>
          <div className="flex justify-between"><span className="text-muted">Time</span><span className="font-medium">{form.slot}</span></div>
          <div className="flex justify-between"><span className="text-muted">Mode</span><span className="font-medium capitalize">{form.mode}</span></div>
          <div className="flex justify-between"><span className="text-muted">Queue No.</span><span className="font-bold text-teal">A-028</span></div>
        </div>
        <Button className="w-full bg-teal text-white" onClick={onClose}>Done</Button>
      </div>
    )
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i <= step ? 'bg-teal text-white' : 'bg-border text-muted'}`}>{i + 1}</div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-teal' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-3">
          <p className="font-medium text-navy mb-4">What service do you need?</p>
          {['General Consultation', 'Follow-up', 'Antenatal Care', 'Child Immunisation', 'Specialist Referral'].map(s => (
            <button key={s} onClick={() => { set('service', s); setStep(1) }}
              className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-teal hover:bg-teal-light/30 transition-all text-sm font-medium text-text">
              {s} <ChevronRight className="w-4 h-4 float-right mt-0.5 text-muted" />
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="font-medium text-navy mb-4">Choose a doctor</p>
          {DOCTORS.map(d => (
            <button key={d.id} onClick={() => { set('doctor', d); setStep(2) }}
              className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-teal hover:bg-teal-light/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white font-bold">{d.name.split(' ')[1][0]}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy">{d.name}</p>
                  <p className="text-xs text-muted">{d.spec} · {d.facility}</p>
                </div>
                <Badge variant="success" className="text-xs">{d.next_available}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="font-medium text-navy">Select date & time</p>
          <Input label="Date" id="date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          {form.date && (
            <div>
              <p className="text-sm font-medium text-text mb-2">Available slots</p>
              <div className="grid grid-cols-3 gap-2">
                {form.doctor?.slots.map(s => (
                  <button key={s} onClick={() => set('slot', s)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${form.slot === s ? 'border-teal bg-teal text-white' : 'border-border hover:border-teal text-muted'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full bg-teal text-white" disabled={!form.date || !form.slot} onClick={() => setStep(3)}>Continue</Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="font-medium text-navy mb-4">How would you like to consult?</p>
          {[
            { id: 'in-person', label: 'In-Person Visit', icon: User, desc: 'Visit the facility on the appointment day' },
            { id: 'teleconsultation', label: 'Teleconsultation', icon: Video, desc: 'Video call from your phone or device' },
            { id: 'assisted', label: 'Assisted Teleconsult', icon: User, desc: 'Frontline worker assists at local centre' },
          ].map(m => (
            <button key={m.id} onClick={() => { set('mode', m.id); setStep(4) }}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${form.mode === m.id ? 'border-teal bg-teal-light/30' : 'border-border hover:border-teal'}`}>
              <div className="flex items-center gap-3">
                <m.icon className="w-5 h-5 text-teal" />
                <div>
                  <p className="font-medium text-sm text-navy">{m.label}</p>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="font-medium text-navy mb-4">Confirm your appointment</p>
          <div className="bg-bg rounded-xl p-5 space-y-3 text-sm border border-border mb-6">
            <div className="flex justify-between"><span className="text-muted">Service</span><span className="font-medium">{form.service}</span></div>
            <div className="flex justify-between"><span className="text-muted">Doctor</span><span className="font-medium">{form.doctor?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted">Facility</span><span className="font-medium">{form.doctor?.facility}</span></div>
            <div className="flex justify-between"><span className="text-muted">Date & Time</span><span className="font-medium">{form.date} at {form.slot}</span></div>
            <div className="flex justify-between"><span className="text-muted">Mode</span><span className="font-medium capitalize">{form.mode}</span></div>
          </div>
          <Button className="w-full bg-teal text-white" size="lg" onClick={confirmBooking}>Confirm Booking</Button>
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setStep(0)}>Start Over</Button>
        </div>
      )}
    </div>
  )
}

export default function Appointments() {
  const [bookingOpen, setBookingOpen] = useState(false)

  const statusVariant = { confirmed: 'success', pending: 'warning', cancelled: 'critical' }

  return (
    <AppLayout role="patient">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Appointments</h1>
            <p className="text-muted text-sm">Manage and book healthcare appointments</p>
          </div>
          <Button className="bg-teal text-white" onClick={() => setBookingOpen(true)}>
            <Calendar className="w-4 h-4" /> Book Appointment
          </Button>
        </div>

        <div className="space-y-4">
          {MOCK_APPOINTMENTS.map(appt => (
            <Card key={appt.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center bg-teal-light rounded-xl p-3 w-16 flex-shrink-0">
                    <span className="text-xs font-bold text-teal">{new Date(appt.date).toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-2xl font-bold text-navy">{new Date(appt.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-navy">{appt.doctor}</h3>
                      <Badge variant={statusVariant[appt.status]}>{appt.status}</Badge>
                    </div>
                    <p className="text-sm text-muted">{appt.type}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{appt.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{appt.facility}</span>
                      <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" className={appt.mode === 'teleconsultation' ? 'text-teal' : ''} />{appt.mode}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-navy text-surface px-2 py-0.5 rounded-full font-mono font-bold">Queue: {appt.queue_no}</span>
                      {appt.status === 'confirmed' && (
                        <Button size="sm" className="bg-teal text-white">Join Consultation</Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={bookingOpen} onClose={() => setBookingOpen(false)} title="Book Appointment" size="md">
        <BookingWizard onClose={() => setBookingOpen(false)} />
      </Modal>
    </AppLayout>
  )
}
